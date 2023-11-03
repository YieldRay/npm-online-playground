export function require(packageName) {
    if (!packageName) return;
    const [text, url] = fetchTextSync((isURL(packageName) ? "" : "https://unpkg.com/") + packageName);
    if (!text) {
        console.error(`加载失败 ${url}`);
        return;
    }
    let fixedText = text;
    for (const req of text.match(/require\(("|')[^\1]+?\1\)/g) || []) {
        const arg = req.match(/require\(("|')([^\1]+?)\1\)/);
        if (arg.length !== 3) continue;
        const path = arg[2];
        if (path.startsWith(".") || path.startsWith("/")) {
            const newPath = new URL(path, url).href;
            fixedText = fixedText.replace(req, `require("${newPath}")`);
        }
    }
    return execCommonJS(fixedText);
}

function isURL(url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function execCommonJS(sourceCode) {
    const module = {
        id: "<repl>",
        path: ".",
        exports: {},
        filename: null,
        loaded: false,
        children: [],
        paths: [],
    };
    let exports = module.exports;
    const process = { env: {} };
    eval(sourceCode);
    return module.exports;
}

function fetchTextSync(url) {
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    if (request.status === 200) {
        console.info(`加载了 ${request.responseURL}`);
        return [request.responseText, request.responseURL];
    }
    return [, request.responseURL];
}

function appendScriptToHead(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = (e) => resolve(e);
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
    });
}

export function pkg2head(packageName) {
    return appendScriptToHead("https://unpkg.com/" + packageName);
}

export function import$(packageName, attributes = { cdn: "esm.sh" }) {
    if (packageName == undefined) throw new SyntaxError(`import$() requires a specifier`);
    packageName = String(packageName);
    if (typeof attributes !== "object") throw new TypeError(`The second argument to import$() must be an object`);
    const cdn = attributes.cdn;

    let url
    if (/^https?:\/\//.test(packageName)) {
        url = packageName;
    } else if (cdn && cdn.endsWith("/")) {
        url = attributes.cdn + packageName;
    } else {
        const cdnOrigin = ESM_PROVIDERS[cdn];
        if (!cdnOrigin)
            throw new Error(`CDN provider '${cdn}' is not in built-in CDN list, try: ${Object.keys(ESM_PROVIDERS)}"`);
        url = cdnOrigin + "/" + packageName;
    }

    return import(url, attributes);
}

const ESM_PROVIDERS = {
    "esm.run": "https://esm.run", // by jsDelivr
    "esm.sh": "https://esm.sh",
    skypack: "https://cdn.skypack.dev",
    jspm: "https://jspm.dev",
};
