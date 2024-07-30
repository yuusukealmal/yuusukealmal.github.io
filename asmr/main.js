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


var headers = {
    "Referer": 'https://www.asmr.one/',
    "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
};

async function getToken() {
    const response = await axios.post(
        'https://api.asmr.one/api/auth/me',
        {
            "name": "guest",
            "password": "guest"
        },
        Headers = {
            "Referer": 'https://www.asmr.one/',
            "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
        },
        timeout = 120
    );

    headers = {
        ...headers,
        "Authorization": `Bearer ${response.data.token}`,
    };
}

async function getVoiceInfo(voiceID) {
    const response = await axios.get(
        `https://api.asmr.one/api/work/${voiceID}`,
        Headers = headers,
        timeout = 120
    );
    return response.status === 200 ? response.data : null;
}

async function getTreackInfo(voiceID) {
    const response = await axios.get(
        `https://api.asmr.one/api/tracks/${voiceID}`,
        Headers = headers,
        timeout = 120
    );
    return JSON.parse(JSON.stringify(response.data));
}

async function downloadRJS(RJCodes, zip, callback) {
    const info = await getVoiceInfo(RJCodes);
    printInfo(info);
    const tracks = await getTreackInfo(RJCodes);
    await scan(tracks, "RJ" + RJCodes, zip);

    await downloadZip(zip.generate({ type: "blob" }), "RJ" + RJCodes, callback);
}

async function downloadZip(content, dir, callback) {
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

async function quere(RJCodes) {
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
        await quere(RJs);
    });
})