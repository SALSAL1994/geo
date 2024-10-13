function cleanString  (str)  {
    if (!str) return undefined;
    str = String(str)
    str = str.toLowerCase();
    str = str.replace(/\s+/g, " ");
    str = str.replaceAll("-", "");
    str = str.replaceAll("/", "");
    str = str.trim();
    return str;
};

function findOverlappingWords (str, srt_array)  {
    const words = str.split(" ");
    const res = [];
    srt_array.forEach(a => {
        let all_overlapped = true;
        words.forEach(w => {
            let overlapped = false;
            a.split(" ").forEach(w2 => {
                if (w == w2) overlapped = true;
                //if (overlapped) break;
            });
            if (!overlapped) all_overlapped = false;
            //if (!overlapped) break;
        });
        if (all_overlapped) res.push(a);
    });
    return res;
};

module.exports = {
    cleanString: cleanString,
    findOverlappingWords: findOverlappingWords
}