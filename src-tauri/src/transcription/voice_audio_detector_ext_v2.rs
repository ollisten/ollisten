use futures_core::ready;
use kalosm::sound::VoiceActivityDetectorOutput;
use rodio::buffer::SamplesBuffer;
use std::f32::consts::E;
use std::{collections::VecDeque, task::Poll, time::Duration};

/// A stream of audio chunks with a voice activity probability rolling average above a given threshold
pub struct VoiceActivityRechunkerStreamV2<S> {
    source: S,
    start_threshold: f32,
    start_window: Duration,
    end_threshold: f32,
    end_window: Duration,
    include_duration_before: Duration,
    duration_before_window: Duration,
    duration_in_voice: Duration,
    max_duration: Duration,
    decay_factor: f32,
    in_voice_run: bool,
    buffer: VecDeque<SamplesBuffer<f32>>,
    channels: u16,
    sample_rate: u32,
    voice_probabilities_window: VecDeque<(f32, Duration)>,
    duration_in_window: Duration,
    voice_probabilities_window_sum: f32,
    voice_probabilities_before_window_sum: f32,
}

impl<S> VoiceActivityRechunkerStreamV2<S> {
    /// Set the threshold for the start of a voice activity run
    pub fn with_start_threshold(mut self, start_threshold: f32) -> Self {
        self.start_threshold = start_threshold;
        self
    }

    /// Set the window for the start of a voice activity run
    pub fn with_start_window(mut self, start_window: Duration) -> Self {
        self.start_window = start_window;
        self
    }

    /// Set the threshold for the end of a voice activity run
    pub fn with_end_threshold(mut self, end_threshold: f32) -> Self {
        self.end_threshold = end_threshold;
        self
    }

    /// Set the window for the end of a voice activity run
    pub fn with_end_window(mut self, end_window: Duration) -> Self {
        self.end_window = end_window;
        self
    }

    /// Set the time before the speech run starts to include in the output
    pub fn with_time_before_speech(mut self, time_before_speech: Duration) -> Self {
        self.include_duration_before = time_before_speech;
        self
    }
}

impl<S> VoiceActivityRechunkerStreamV2<S> {
    pub fn new(
        source: S,
        start_threshold: f32,
        start_window: Duration,
        end_threshold: f32,
        end_window: Duration,
        include_duration_before: Duration,
        max_duration: Duration,
        decay_factor: f32,
    ) -> Self {
        Self {
            source,
            start_threshold,
            start_window,
            end_threshold,
            end_window,
            include_duration_before,
            max_duration,
            decay_factor,
            duration_before_window: Duration::ZERO,
            duration_in_voice: Duration::ZERO,
            in_voice_run: false,
            buffer: VecDeque::new(),
            channels: 1,
            sample_rate: 0,
            voice_probabilities_window: VecDeque::new(),
            duration_in_window: Duration::ZERO,
            voice_probabilities_window_sum: 0.0,
            voice_probabilities_before_window_sum: 0.0,
        }
    }

    fn add_sample(&mut self, probability: f32, len: Duration, window: Duration) {
        // info!(
        //     "add_sample: probability: {}, len: {}s, window: {}s",
        //     probability,
        //     len.as_secs_f64(),
        //     window.as_secs_f64()
        // );
        // Add the samples to the rolling average
        self.voice_probabilities_window
            .push_front((probability, len));
        self.voice_probabilities_window_sum += probability * len.as_secs_f32();
        self.duration_in_window += len;
        // If the buffer is full, remove the first probability from the rolling average
        while self.duration_in_window > window {
            self.pop_last_sample();
        }
    }

    fn pop_last_sample(&mut self) {
        let (probability, len) = self.voice_probabilities_window.pop_back().unwrap();
        self.voice_probabilities_window_sum -= probability * len.as_secs_f32();
        if self.in_voice_run {
            self.voice_probabilities_before_window_sum += probability * len.as_secs_f32();
        }
        self.duration_in_window -= len;
    }

    fn window_rolling_average(&self) -> f32 {
        self.voice_probabilities_window_sum / self.duration_in_window.as_secs_f32()
    }

    fn voice_rolling_average(&self) -> f32 {
        (self.voice_probabilities_window_sum + self.voice_probabilities_before_window_sum)
            / (self.duration_in_voice.as_secs_f32() + self.include_duration_before.as_secs_f32())
    }

    /// Calculate the end threshold that determines at what rolling window average we should stop.
    /// perform an exponential decay by getting closer to the average voice level.
    fn decaying_end_threshold(&self) -> f32 {
        let voice_rolling_average = self.voice_rolling_average();
        let k = self.decay_factor * (voice_rolling_average / self.end_threshold).ln()
            / self.max_duration.as_secs_f32();
        self.end_threshold * E.powf(k * self.duration_in_voice.as_secs_f32())
    }

    fn finish_voice_run(&mut self) -> SamplesBuffer<f32> {
        let samples = SamplesBuffer::new(
            self.channels,
            self.sample_rate,
            std::mem::take(&mut self.buffer)
                .into_iter()
                .flatten()
                .collect::<Vec<_>>(),
        );
        self.voice_probabilities_window_sum = 0.0;
        self.voice_probabilities_before_window_sum = 0.0;
        self.duration_in_window = Duration::ZERO;
        self.voice_probabilities_window.clear();
        self.in_voice_run = false;
        self.duration_before_window = Duration::ZERO;
        self.duration_in_voice = Duration::ZERO;
        self.buffer.clear();
        samples
    }
}

impl<S: futures_core::Stream<Item = VoiceActivityDetectorOutput> + Unpin> futures_core::Stream
    for VoiceActivityRechunkerStreamV2<S>
{
    type Item = SamplesBuffer<f32>;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        let this = self.get_mut();
        loop {
            let source = std::pin::pin!(&mut this.source);
            let next = ready!(source.poll_next(cx));
            if let Some(next) = next {
                // Set the sample rate from the stream
                this.sample_rate = rodio::Source::sample_rate(&next.samples);
                let sample_duration = rodio::Source::total_duration(&next.samples)
                    .expect("samples must have a duration");
                let window = if this.in_voice_run {
                    this.end_window
                } else {
                    this.start_window
                };
                this.add_sample(next.probability, sample_duration, window);
                // If we are inside a chunk that looks like voice, set the in voice run flag
                if !this.in_voice_run && this.window_rolling_average() > this.start_threshold {
                    this.in_voice_run = true;
                }
                // Add the samples to the buffer
                this.buffer.push_back(next.samples);
                // If this is inside a voice run, add the sample to the buffer
                if this.in_voice_run {
                    this.duration_in_voice += sample_duration;
                    // Otherwise, if we just left a chunk that looks like voice, add the buffer to the output
                    let rolling_average = this.window_rolling_average();
                    let decaying_end_threshold = this.decaying_end_threshold();
                    // info!(
                    //     "rolling_average {} decaying_end_threshold {} duration_in_voice {}s probability {}",
                    //     rolling_average,
                    //     decaying_end_threshold,
                    //     this.duration_in_voice.as_secs_f64(),
                    //     next.probability,
                    // );
                    if rolling_average < decaying_end_threshold
                        || this.duration_in_voice > this.max_duration
                    {
                        let samples = this.finish_voice_run();
                        return Poll::Ready(Some(samples));
                    }
                } else {
                    // Otherwise, add it to the pre-voice buffer
                    this.duration_before_window += sample_duration;
                    // If the pre-voice buffer is full, remove the first sample from it
                    while this.duration_before_window >= this.include_duration_before {
                        let sample = this.buffer.pop_front().unwrap();
                        this.duration_before_window -= rodio::Source::total_duration(&sample)
                            .expect("samples must have a duration");
                    }
                }
            } else {
                // Finish off the current voice run if there is one
                if this.in_voice_run {
                    let samples = this.finish_voice_run();
                    return Poll::Ready(Some(samples));
                }
                // Otherwise, return None and finish the stream
                return Poll::Ready(None);
            }
        }
    }
}
