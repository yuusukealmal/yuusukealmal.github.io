async function getLineContent() {
    const response = await axios.get('https://api.xygeng.cn/openapi/one/');
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    document.getElementById('lines').innerHTML = converter(response.data.data.content);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timeString = `${hours}:${minutes}:${seconds}`;
    document.getElementById('clock').innerText = timeString;
}

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
