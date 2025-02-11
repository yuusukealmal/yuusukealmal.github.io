function switchTheme() {
    const theme = document.getElementById('theme').value;
    const root = document.documentElement;

    if (theme === 'light') {
        root.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else if (theme === 'system') {
        root.removeAttribute('data-theme');
        localStorage.setItem('theme', 'system');
        apply();
    }
}

function apply() {
    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;

    if (darkMediaQuery.matches) {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }

    darkMediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    });
}

function init() {
    const savedTheme = localStorage.getItem('theme') || 'system';
    document.getElementById('theme').value = savedTheme;

    if (savedTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
    } else if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        apply();
    }
}


// var headers = {
//     "Referer": 'https://www.asmr.one/',
//     "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
// };
var headers = {};

const corsProxy = 'https://cors-anywhere.herokuapp.com/';

async function getToken() {
    const response = await axios.post(
        `${corsProxy}https://api.asmr.one/api/auth/me`,
        {
            "name": "guest",
            "password": "guest"
        },
        {
            headers,
            timeout: 120000
        }
    );

    headers = {
        "Authorization": `Bearer ${response.data.token}`,
    };
}

async function getVoiceInfo(voiceID) {
    const response = await axios.get(
        `${corsProxy}https://api.asmr.one/api/work/${voiceID}`,
        {
            headers: headers,
            timeout: 120000
        }
    );
    return response.status === 200 ? response.data : null;
}

async function getTrackInfo(voiceID) {
    const response = await axios.get(
        `${corsProxy}https://api.asmr.one/api/tracks/${voiceID}`,
        {
            headers: headers,
            timeout: 120000
        }
    );
    return JSON.parse(JSON.stringify(response.data));
}

function printInfo(info) {
    console.log(`ID: ${info.id}`)
    console.log(`標題: ${info.title}`)
    console.log(`社團名: ${info.name}`)
    console.log(`NSFW: ${info.nsfw}`)
    console.log(`標籤: ${info.tags.map(tag => tag.name).join(', ')}`)
}

async function downloadRJS(RJCodes, zip, callback) {
    const info = await getVoiceInfo(RJCodes);
    printInfo(info);
    const tracks = await getTrackInfo(RJCodes);
    await scan(tracks, "RJ" + RJCodes, zip);

    await downloadZip(zip, "RJ" + RJCodes, callback);
}

async function scan(tracks, current_path, zip) {
    for (const item of tracks) {
        if ("type" in item) {
            if (item.type === "folder") {
                const folder_path = `${current_path}/${item.title}`;
                await scan(item.children, folder_path, zip);
            } else {
                await downloadFile(item.mediaDownloadUrl, current_path, item.title, zip);
            }
        }
    }
}

async function downloadFile(url, path, filename, zip) {
    console.log(`Downloading ${path}/${filename}...`);
    try {
        const response = await axios.get(
            `${corsProxy}${url}`, {
                headers: headers,
                responseType: 'blob'
        });

        const blob = response.data;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const buffer = e.target.result;
                zip.file(`${path}/${filename}`, buffer);
                resolve();
            };
            reader.onerror = (err) => {
                reject(err);
            };
            reader.readAsArrayBuffer(blob);
        });
    } catch (error) {
        console.error('Error downloading file: ', error);
        throw error;
    }
}

async function downloadZip(zip, dir, callback) {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dir}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    callback();
}

async function queue(RJCodes) {
    const RJs = RJCodes.split(" ");
    await getToken();
    let processedFilesCount = 0;

    for (const RJ of RJs) {
        const zip = new JSZip();
        const parts = RJ.split("RJ");
        const RJId = parts.length > 1 ? parts[1] : RJ;

        await downloadRJS(RJId, zip, () => {
            processedFilesCount++;
            if (processedFilesCount === RJs.length) {
                console.log(`Downloaded ${RJs.length} files successfully.`);
                setTimeout(() => {
                    location.reload();
                }, 3000);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('check-button').addEventListener('click', async (event) => {
        event.preventDefault();
        const RJs = document.getElementById('RJCodes').value;
        await queue(RJs);
    });
});