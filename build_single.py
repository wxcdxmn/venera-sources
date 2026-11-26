#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""单源包：每个源单独一个 .venera，供只能导入 .venera 的用户逐个添加。

以已打好的两源包为模板（复用其空数据库与包结构），把 appdata.json 的源注册
裁剪成只剩一个源；comic_source/ 目录里也只留该源的 js。
源内部 url 指向 jsDelivr 无 ref 直链，导入后 App 的「检查更新」可单独升级该源。
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
OUT_DIR = os.path.join(PKG_DIR, '单源包')

INDEX_URL = 'https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/index.json'
REPO_NAME = 'wxcdxmn/venera-sources'
LIB_NAME = 'cdn.jsdelivr.net/wxcdxmn/venera-sources'
REPO_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, INDEX_URL))

SOURCES = {
    'toontop': {
        'key': 'toontop',
        'name': 'TOONTOP',
        'file': 'toontop.js',
        'explore': ['TOONTOP'],
        'category': 'TOONTOP',
    },
    'manga18fx': {
        'key': 'manga18fx',
        'name': 'MANGA18FX',
        'file': 'm18.js',
        'explore': ['MANGA18FX · 最近更新', 'MANGA18FX · 热度榜'],
        'category': 'MANGA18FX',
    },
}

TEMPLATES = [
    ('TOONTOP+MANGA18FX_VeneraX（基于Next新版）.venera', 'VeneraX'),
    ('TOONTOP+MANGA18FX_Venera通用版.venera', 'universal'),
]


def scrub_db(data):
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


def rebuild_appdata(appdata, src):
    s = appdata['settings']
    key, f = src['key'], src['file']

    s['comicSourceRepositories'] = [{'id': REPO_ID, 'name': REPO_NAME, 'url': INDEX_URL}]
    s['comicSourceOrigins'] = {
        key: {
            'kind': 'repository',
            'repositoryId': REPO_ID,
            'repositoryName': REPO_NAME,
            'url': INDEX_URL.replace('index.json', f),
        }
    }
    s['comicSourceProvenance'] = {
        key: {
            'libraryIds': [REPO_ID],
            'originId': REPO_ID,
            'updateLibraryId': REPO_ID,
            'sourceFileName': f,
        }
    }
    s['comicSourceLibraries'] = [{
        'id': REPO_ID, 'name': LIB_NAME, 'url': INDEX_URL,
        'enabled': True, 'priority': 0, 'lastChecked': None,
    }]

    s['explore_pages'] = list(src['explore'])
    s['categories'] = [src['category']]
    s['searchSources'] = [key]
    s['comicSourceOrder'] = [key]
    s['defaultSearchTarget'] = key
    s['favorites'] = []

    for field in ('comicSpecificSettings', 'deviceSpecificSettings'):
        v = s.get(field)
        if isinstance(v, dict):
            s[field] = {k: val for k, val in v.items() if k == key}

    for field in ('searchShortcuts',):
        v = s.get(field)
        if isinstance(v, list):
            s[field] = [x for x in v if not (isinstance(x, dict) and x.get('source') not in (None, key))]
    return appdata


def build(tpl, variant, src_key):
    src = SOURCES[src_key]
    tpl_path = os.path.join(PKG_DIR, tpl)
    out_name = '%s-single-%s.venera' % (src['name'], variant)
    out_path = os.path.join(OUT_DIR, out_name)

    with zipfile.ZipFile(tpl_path) as z:
        info = {n: z.getinfo(n) for n in z.namelist()}
        appdata = rebuild_appdata(json.loads(z.read('appdata.json').decode('utf-8')), src)
        payload = json.dumps(appdata, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

        tmp = out_path + '.tmp'
        written = []
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
            for n in z.namelist():
                if n == 'appdata.json' or n == 'manifest.json' or n.startswith('comic_source/'):
                    continue
                data = z.read(n)
                if n.endswith('.db'):
                    data = scrub_db(data)
                out.writestr(info[n], data)
                written.append(n)
            out.writestr('appdata.json', payload)
            written.append('appdata.json')
            out.writestr('comic_source/' + src['file'],
                         open(os.path.join(SRC_DIR, src['file']), 'rb').read())
            written.append('comic_source/' + src['file'])
            # manifest 必须与实际内容一致，否则部分客户端会因缺文件而拒绝导入
            if 'manifest.json' in z.namelist():
                out.writestr('manifest.json', json.dumps(
                    {'format': 1, 'files': written}, ensure_ascii=False,
                    separators=(',', ':')))
        shutil.move(tmp, out_path)
    return out_path


def verify(path, src_key):
    src = SOURCES[src_key]
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None, 'zip 损坏'
        names = z.namelist()
        js = [n for n in names if n.startswith('comic_source/')]
        assert js == ['comic_source/' + src['file']], js
        s = json.loads(z.read('appdata.json'))['settings']
        assert list(s['comicSourceOrigins']) == [src['key']], s['comicSourceOrigins']
        assert list(s['comicSourceProvenance']) == [src['key']]
        assert s['searchSources'] == [src['key']]
        assert s['comicSourceOrder'] == [src['key']]
        assert s['categories'] == [src['category']]
        assert s['explore_pages'] == src['explore']
        assert s['defaultSearchTarget'] == src['key']
        assert s['favorites'] == []
        assert len(s['comicSourceRepositories']) == 1
        body = z.read('comic_source/' + src['file']).decode('utf-8')
        assert 'cdn.jsdelivr.net/gh/wxcdxmn/venera-sources' in body
        if 'manifest.json' in names:
            mf = json.loads(z.read('manifest.json'))
            assert 'manifest.json' not in mf['files']
            assert set(mf['files']) == set(n for n in names if n != 'manifest.json'), 'manifest 与实际内容不一致'
        ver = body.split('version =')[1].split('\n')[0].strip(' "\'')
        return ver


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for tpl, variant in TEMPLATES:
        for key in SOURCES:
            p = build(tpl, variant, key)
            ver = verify(p, key)
            print('OK  %-34s | %5.0fKB | 1 源 | js version=%s'
                  % (os.path.basename(p), os.path.getsize(p) / 1024, ver))


if __name__ == '__main__':
    main()
