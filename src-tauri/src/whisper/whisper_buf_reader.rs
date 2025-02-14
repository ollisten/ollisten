use std::io::{self, BufReader, Read};

// Custom function to read lines with [2K as a delimiter and flush on `.`
pub fn whisper_buf_reader<R: Read>(
    reader: BufReader<R>,
) -> impl Iterator<Item = io::Result<String>> {
    let mut buffer = String::new();
    reader.bytes().filter_map(move |byte| match byte {
        // Newline delimiters
        Ok(b'\x0A') => flush(&mut buffer),
        Ok(b'\x0D') => flush(&mut buffer),

        // Sentence delimiters
        Ok(b'.') => {
            push(&mut buffer, '.');
            flush(&mut buffer)
        }
        Ok(b'?') => {
            push(&mut buffer, '?');
            flush(&mut buffer)
        }

        // Handling of ESC + [2K to clear buffer
        Ok(b'\x1B') => {
            push(&mut buffer, 'E') // ESC character
        }
        Ok(b'\x0D') => {
            push(&mut buffer, 'E') // ESC character
        }
        Ok(b'K') => {
            if buffer.ends_with("E[2") {
                clear(&mut buffer)
            } else {
                push(&mut buffer, 'K')
            }
        }

        // Push any other character on the stack
        Ok(byte) => push(&mut buffer, byte as char),

        // Pass along errors
        Err(e) => Some(Err(e)),
    })
}

fn clear(buffer: &mut String) -> Option<io::Result<String>> {
    buffer.clear();
    None
}

fn flush(buffer: &mut String) -> Option<io::Result<String>> {
    if buffer.len() >= 3 {
        let result = Ok(buffer.trim().to_string());
        buffer.clear();
        Some(result)
    } else {
        None // Don't return an empty string
    }
}

fn push(buffer: &mut String, byte: char) -> Option<io::Result<String>> {
    buffer.push(byte);
    None
}
