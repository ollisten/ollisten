
// https://stackoverflow.com/a/8809472
export function randomUuid() {
    var d = new Date().getTime();
    //Time in microseconds since page-load or 0 if unsupported
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        //random number between 0 and 16
        var r = Math.random() * 16;
        //Use timestamp until depleted
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
            //Use microseconds since page-load if supported
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

let counter = 0;
const MAX_COUNTER = 0xFFF; // Maximum value for the counter (12 bits)
export function randomTimeUuid(): string {
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const counterValue = counter.toString(16).padStart(3, '0'); // Counter as a 3-digit hex string

    // Increment the counter and reset if it exceeds the maximum value
    counter = (counter + 1) & MAX_COUNTER;

    // Generate a UUID-like string using timestamp and counter
    const uuid = `${timestamp.toString(16)}-${counterValue}`;

    return uuid;
}
