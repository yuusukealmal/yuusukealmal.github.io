document.getElementById('fileInput').addEventListener('change', function() {
    const output = document.getElementById('output');
    const fn = document.getElementById('fn');
    const fs = document.getElementById('fs');

    const files = Array.from(this.files);
    let processedFilesCount = 0;

    files.forEach(file => {
        output.textContent = `File: ${file.name}`;
        fs.style.display = 'none';
        fn.style.display = 'block';
        decryptFile(file, () => {
            processedFilesCount++;
            if (processedFilesCount === files.length) {
                alert(`Download ${files.length} pack Success.`);
                setTimeout(() => {
                    location.reload();
                }, 3000);
            }
        });
    });
});

async function decryptFile(file, callback) {
    const output = document.getElementById('output');
    try {
        const reader = new FileReader();
        const zip = new JSZip();

        reader.onload = async function(event) {
            const pack = event.target.result;
            const packBytes = new Uint8Array(pack);

            const lengthBytes = packBytes.slice(0x20, 0x24);
            const length = new Uint32Array(lengthBytes.buffer)[0];
            output.innerHTML += `<br>Length: ${length}`;

            const pad = 16 * Math.ceil(length / 16);
            output.innerHTML += `<br>Pad: ${pad}`;

            const keyBytes = packBytes.slice(0x10, 0x20);
            const key = CryptoJS.lib.WordArray.create(keyBytes);
            output.innerHTML += `<br>Key: ${key}`;

            const ivMD5 = CryptoJS.MD5("battlecatsultimate").toString(CryptoJS.enc.Hex).slice(0, 32);
            const iv = CryptoJS.enc.Hex.parse(ivMD5);
            output.innerHTML += `<br>IV: ${iv}`;

            const infoBytes = packBytes.slice(0x24, 0x24 + pad);
            const infoAES = CryptoJS.AES.decrypt(
                { ciphertext: CryptoJS.lib.WordArray.create(infoBytes) },
                key,
                { iv: iv, mode: CryptoJS.mode.CBC, }
            );
            let infoText = infoAES.toString(CryptoJS.enc.Utf8);
            infoText = infoText.substring(0, infoText.lastIndexOf('}') + 1);
            zip.file("info.json", infoText);

            const info = JSON.parse(infoText);
            const dir = info.desc.names.dat[0].val || infoText.desc.id;
            const id = info.desc.id;
            const folder = zip.folder(id);
            output.innerHTML += `<br>Pack Name: ${dir}&emsp;&emsp;ID: ${id}`;

            for (let file of info["files"]) {
                await processFile(file, packBytes, pad, key, iv, folder);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            downloadZip(content, dir, callback);
        };
        reader.readAsArrayBuffer(file);
    } catch (e) {
        alert(e.message);
        location.reload();
    }
}

async function processFile(file, packBytes, pad, key, iv, folder) {
    const name = file["path"];
    const size = file["size"];
    const offset = file["offset"];

    const dataBytes = packBytes.slice(0x24 + pad);
    const fileData = dataBytes.slice(offset, offset + (size + (16 - size % 16)));

    const fileAES = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.lib.WordArray.create(fileData) },
        key,
        { iv: iv, mode: CryptoJS.mode.CBC, }
    );
    const res = new Uint8Array(Math.abs(fileAES.sigBytes));
    for (let i = 0; i < fileAES.sigBytes; i++) {
        res[i] = fileAES.words[i >>> 2] >>> (24 - (i % 4) * 8) & 0xff;
    }

    if (name === "./pack.json") {
        const decoder = new TextDecoder('utf-8');
        const packText = decoder.decode(res);
        folder.file("pack.json", packText.substring(0, packText.lastIndexOf('}') + 1));
        return;
    }

    folder.file(name.replace("./", ""), res);
}

function downloadZip(content, dir, callback) {
    const blob = new Blob([content]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dir}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    callback();
}
