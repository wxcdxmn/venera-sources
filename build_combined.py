#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""整合包：只保留 TOONTOP + MANGA18FX 两个源，其余源、展示位、收藏、历史全部清空。

以已有 .venera 为模板（复用其中的空数据库与包结构），重建 appdata.json 的源注册：
    单仓库（venera-sources）→ comicSourceRepositories 1 项
    comicSourceOrigins / comicSourceProvenance 各 2 项
    comicSourceLibraries 1 项（新旧两套 schema 都写，兼容 Venera 与 VeneraX）
"""
import json
import os
import shutil
import sqlite3
import tempfile
import uuid
import zipfile

BASE = r'C:\Users\28614\WorkBuddy\2026-11-26-08-49-59'
PKG_DIR = os.path.join(BASE, 'venera_pkg')
SRC_DIR = os.path.join(BASE, 'combined')

INDEX_URL = 'https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json'
REPO_NAME = 'wxcdxmn/venera-sources'
LIB_NAME = 'cdn.jsdelivr.net/wxcdxmn/venera-sources@main'
REPO_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, INDEX_URL))

SOURCES = [
    {
        'key': 'toontop',
        'name': 'TOONTOP',
        'file': 'toontop.js',
        'explore': ['TOONTOP'],
        'category': 'TOONTOP',
    },
    {
        'key': 'manga18fx',
        'name': 'MANGA18FX',
        'file': 'm18.js',
        'explore': ['MANGA18FX · 最近更新', 'MANGA18FX · 热度榜'],
        'category': 'MANGA18FX',
    },
]

KEEP_KEYS = set(s['key'] for s in SOURCES)
KEEP_FILES = set('comic_source/' + s['file'] for s in SOURCES)

TEMPLATES = [
    ('TOONTOP+MANGA18FX_VeneraX（基于Next新版）.venera', 'venera-sources_VeneraX（基于Next新版）.venera'),
    ('TOONTOP+MANGA18FX_Venera通用版.venera', 'venera-sources_Venera通用版.venera'),
]


def scrub_db(data):
    """清空数据库行数据，保留表结构。"""
    tmp = os.path.join(tempfile.gettempdir(), 'clean_%s.db' % uuid.uuid4().hex)
    with open(tmp, 'wb') as f:
        f.write(data)
    try:
        c = sqlite3.connect(tmp)
        for (t,) in c.execute("select name from sqlite_master where type='table'").fetchall():
            try:
                c.execute('DELETE FROM "%s"' % t)
            except Exception:
                pass
        c.commit()
        c.execute('VACUUM')
        c.close()
        with open(tmp, 'rb') as f:
            return f.read()
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def rebuild_appdata(appdata):
    s = appdata['settings']

    s['comicSourceRepositories'] = [{'id': REPO_ID, 'name': REPO_NAME, 'url': INDEX_URL}]
    s['comicSourceOrigins'] = {}
    s['comicSourceLibraries'] = []
    s['comicSourceProvenance'] = {}

    s['comicSourceLibraries'].append({
        'id': REPO_ID,
        'name': LIB_NAME,
        'url': INDEX_URL,
        'enabled': True,
        'priority': 0,
        'lastChecked': None,
    })

    for src in SOURCES:
        s['comicSourceOrigins'][src['key']] = {
            'kind': 'repository',
            'repositoryId': REPO_ID,
            'repositoryName': REPO_NAME,
            'url': INDEX_URL.replace('index.json', src['file']),
        }
        s['comicSourceProvenance'][src['key']] = {
            'libraryIds': [REPO_ID],
            'originId': REPO_ID,
            'updateLibraryId': REPO_ID,
            'sourceFileName': src['file'],
        }

    s['explore_pages'] = [t for src in SOURCES for t in src['explore']]
    s['categories'] = [src['category'] for src in SOURCES]
    s['searchSources'] = [src['key'] for src in SOURCES]
    s['comicSourceOrder'] = [src['key'] for src in SOURCES]

    # 只属于这两个源的显示位，其余一律清空
    if s.get('defaultSearchTarget') not in KEEP_KEYS:
        s['defaultSearchTarget'] = 'toontop'
    s['favorites'] = []
    s['history'] = [] if isinstance(s.get('history'), list) else s.get('history')

    # 按源维度的设置项，清掉已删除的源
    for field in ('comicSpecificSettings', 'deviceSpecificSettings'):
        v = s.get(field)
        if isinstance(v, dict):
            s[field] = {k: val for k, val in v.items() if k in KEEP_KEYS}

    # 兜底：任何还残留旧源 key 的数组字段
    for field in ('searchShortcuts',):
        v = s.get(field)
        if isinstance(v, list):
            s[field] = [x for x in v if not (isinstance(x, dict) and x.get('source') not in (None, *KEEP_KEYS))]

    return appdata


def build(tpl, out_name):
    tpl_path = os.path.join(PKG_DIR, tpl)
    with zipfile.ZipFile(tpl_path) as z:
        info = {n: z.getinfo(n) for n in z.namelist()}
        appdata = json.loads(z.read('appdata.json').decode('utf-8'))
        appdata = rebuild_appdata(appdata)
        payload = json.dumps(appdata, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

        out_path = os.path.join(PKG_DIR, out_name)
        tmp = out_path + '.tmp'
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
            for n in z.namelist():
                if n == 'appdata.json' or n.startswith('comic_source/'):
                    continue
                data = z.read(n)
                if n.endswith('.db'):
                    data = scrub_db(data)
                out.writestr(info[n], data)
            out.writestr('appdata.json', payload)
            for src in SOURCES:
                out.writestr('comic_source/' + src['file'], open(os.path.join(SRC_DIR, src['file']), 'rb').read())
        shutil.move(tmp, out_path)
        return out_path


def verify(path):
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None, 'zip 损坏'
        names = z.namelist()
        s = json.loads(z.read('appdata.json'))['settings']
        ok = True
        detail = []
        detail.append('sources=%d' % len([n for n in names if n.startswith('comic_source/')]))
        ok &= len([n for n in names if n.startswith('comic_source/')]) == 2
        ok &= set(n for n in names if n.startswith('comic_source/')) == KEEP_FILES
        ok &= len(s['comicSourceOrigins']) == 2 and len(s['comicSourceProvenance']) == 2
        ok &= len(s['comicSourceRepositories']) == 1 and len(s['comicSourceLibraries']) == 1
        ok &= s['explore_pages'] == ['TOONTOP', 'MANGA18FX · 最近更新', 'MANGA18FX · 热度榜']
        ok &= s['categories'] == ['TOONTOP', 'MANGA18FX']
        ok &= s['searchSources'] == ['toontop', 'manga18fx']
        ok &= s['comicSourceOrder'] == ['toontop', 'manga18fx']
        ok &= s['favorites'] == []
        detail.append('explore=%d cat=%d search=%d' % (len(s['explore_pages']), len(s['categories']), len(s['searchSources'])))
        return ok, detail


def main():
    for tpl, out in TEMPLATES:
        p = build(tpl, out)
        ok, detail = verify(p)
        print(('OK  ' if ok else 'BAD ') + os.path.basename(p),
              '| %.0fKB | %s' % (os.path.getsize(p) / 1024, ' '.join(detail)))


if __name__ == '__main__':
    main()
