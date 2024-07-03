document.getElementById('fileInput').addEventListener('change', function() {

    const output = document.getElementById('output');
    const fn = document.getElementById('fn');
    const fs = document.getElementById('fs');

    Array.from(this.files).forEach(function(item, index, array){
        const fileName = array.length > 0 ? array[index].name : 'No file selected';
        output.textContent = `File : ${fileName}`;
        fs.style.display = 'none';
        fn.style.display = 'block';
        decryptFile(item);
    });
});

async function decryptFile(file) {

    const output = document.getElementById('output');
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

        const info  = JSON.parse(infoText);
        const dir = info.desc.names.dat[0].val || infoText.desc.id;
        const id  = info.desc.id;
        const folder = zip.folder(id);
        output.innerHTML += `<br>Pack Name: ${dir}&emsp;&emsp;ID: ${id}`;

        for (let _ of info["files"]) {
            const name = _["path"];
            const size = _["size"];
            const offset = _["offset"];
            
            output.innerHTML += `<br>${name}&emsp;&emsp;${size}&emsp;&emsp;${offset}`

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
            };
            
            if (name == "./pack.json") {
                const decoder = new TextDecoder('utf-8');
                const packText = decoder.decode(res);
                folder.file("pack.json", packText.substring(0, packText.lastIndexOf('}') + 1));
                continue;
            };

            folder.file(name.replace("./", ""), res);
        }

        zip.generateAsync({ type: 'blob' })
        .then(function (content) {
            var blob = new Blob([content]);
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = `${dir}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    }
    reader.readAsArrayBuffer(file);
}