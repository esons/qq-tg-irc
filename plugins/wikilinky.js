/*
 * linky - 自動將聊天中的[[]]與{{}}換成Wiki系統的連結
 *
 * 配置方法：在config.js中

    plugins中加入一個 "wikilinky"，然後在末尾補一個：

    "wikilinky": {
        "groups": [
            {
                "group": 123123123,
                "type": "QQ",
                "website": "https://zh.wikipedia.org/wiki/$1"
            }
        ]
    }
 */
'use strict';

const Buffer = require('buffer').Buffer;

const compare = (x, y) => {
    return x.pos - y.pos;
};

let map = {};

const pad = (str) => {
    return `00${str}`.substr(-2);
};

const genlink = (v) => {
    // 處理#
    let str = v.replace(/ /g, '_');
    let p = str.indexOf('#');

    if (p === -1) {
        return encodeURI(str);
    } else {
        /*
          對於#後面的內容：

          不轉成ASCII的：字母、數字、-、.、:、_
          空白轉成「_」
         */
        let s1 = encodeURI(str.substring(0, p));
        let s2 = str.substring(p+1);

        let plain = Buffer.from(s2, 'utf-8').toString('binary');

        s2 = plain.replace(/[^A-Za-z0-9\-\.:_]/g, (ch) => {
            return `.${pad(ch.charCodeAt(0).toString(16).toUpperCase())}`;
        });

        return `${s1}#${s2}`;
    }
};

const linky = (string, prefix) => {
    let text = {};      // 去重複
    let links = [];

    string.replace(/\[\[\s*([^\[\|]+?)\s*(|\|.+?)\]\]/g, (s, l, _, offset) => {
        if (!text[l]) {
            links.push({ pos: offset, link: prefix.replace('$1', genlink(l)) });
            text[l] = true;
        }
        return s;
    });

    string.replace(/([^{]|^){{\s*([^{#\[\]\|]+?)\s*(|\|.+?)}}/g, (s, _, l, __, offset) => {
        let t = l;
        if (!t.toLowerCase().startsWith('template:')) {
            t = 'Template:' + t;
        }
        if (!text[t]) {
            links.push({ pos: offset, link: prefix.replace('$1', `${genlink(t)}`) });
            text[t] = true;
        }
        return s;
    });

    links.sort(compare);
    return links;
};

const processlinky = (context) => {
    try {
        if (map[context.handler.type][context.to]) {
            let links = linky(context.text, map[context.handler.type][context.to]);

            if (links.length > 0) {
                context.reply(links.map(l => l.link).join('  '));
            }
        }
    } catch (ex) {

    }
};

module.exports = (pluginManager, options) => {
    if (!options) {
        return;
    }

    let types = {};

    for (let [type, handler] of pluginManager.handlers) {
        map[type] = {};
    }

    let groups = options.groups || [];
    for (let group of groups) {
        map[group.type][group.group] = group.website;
        types[group.type] = true;
    }

    for (let type in types) {
        pluginManager.handlers.get(type).on('text', processlinky);
    }
};
