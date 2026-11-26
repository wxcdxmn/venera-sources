# Venera 漫画源 · 自建合集

只维护两个源，越少越不容易坏。

| 源 | 站点 | 版本 | 特点 |
| --- | --- | --- | --- |
| **TOONTOP** | toontop.io | 1.3.3 | 接口 + 网页 SSR 双通道，首页 7 区块、72 项题材筛选、全量章节目录 |
| **MANGA18FX** | manga18fx.com | 1.0.4 | 纯网页解析，最近更新 + 热度榜、23 项题材、关键词搜索、正文大图 |

## 订阅（推荐：自动更新，且只加这两个源）

App 内「源仓库 / 订阅」填这一条，只会注册并拉取这两个源，**不动你已有的其它源**：

```
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/index.json
```

单独加某一个源，直接填对应直链即可（同样是自动跟随更新）：

| 源 | 直链 |
| --- | --- |
| TOONTOP | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/toontop.js` |
| MANGA18FX | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/m18.js` |

### 地址怎么写，才既能自动更新又不拿到坏版本

jsDelivr 的 `@main` 是**别名缓存**，落后得最厉害；无 ref 形式（下面这些）会紧跟默认分支，实测落后一版左右，
边缘最坏情况仍是 12 小时 TTL。两者的差别实测如下（同一时刻）：

| 地址形态 | 拿到的版本 |
| --- | --- |
| `.../venera-sources/index.json`（无 ref） | 1.3.2 / 1.0.3 |
| `.../venera-sources@main/index.json` | 1.3.1 / 1.0.1 |

所以本仓库的源内部 `url`、以及推荐你订阅的地址，全部用**无 ref** 形式：

```
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/index.json
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/m18.js
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources/toontop.js
```

要**立刻**拿到最新版（不等 CDN），用 GitHub 原始地址，无任何缓存：

```
https://raw.githubusercontent.com/wxcdxmn/venera-sources/main/index.json
https://raw.githubusercontent.com/wxcdxmn/venera-sources/main/m18.js
https://raw.githubusercontent.com/wxcdxmn/venera-sources/main/toontop.js
```

`@v1.0.4` 这类 tag 地址永远返回发布那一刻的内容，不会自动升级，只适合排障时锁定版本。
从 1.0.3 起历史上的坏版本（1.0.0 / 1.0.1）已被覆盖，即使 CDN 滞后也只会拿到"旧一点但能用"的版本。

手动催更（可选，返回 `finished` 不代表所有边缘都刷新了）：

```
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources/index.json
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources/m18.js
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources/toontop.js
```

## 只能导入 `.venera`？看这一节

VeneraX 没有「加源 / 订阅」入口时，全部走文件导入。三种用法，按你的需求选：

| 我想要的 | 下哪个 | 结果 |
| --- | --- | --- |
| 两个源都要，且不能弄丢原来的 54 个源 | `additive-VeneraX.venera` | 54 → 56 个源，**其余原样保留** |
| 只要这两个源，其它都不要 | `venera-sources-VeneraX.venera` | 只剩 2 个源 |
| 一个一个加，先只加 TOONTOP / 只加 MANGA18FX | `TOONTOP-single-VeneraX.venera`、`MANGA18FX-single-VeneraX.venera` | 只含 1 个源 |

下载：`https://github.com/wxcdxmn/venera-sources/releases/latest`

**单源包也带自动更新**：包内源的 `url` 写的就是 jsDelivr 直链，导入后在「源管理 → 检查更新」
只会重下这一个源的文件，不会动别的源。所以「两个源各自独立更新」在导入之后就是原生的，不需要再整包导入。

⚠️ 一个必须知道的机制：Venera 的 `.venera` 导入是**整体替换源目录**（先删 `comic_source/` 再解包）。
所以单源包适合「只要一个源」或「先导入单源包、再导入另一个单源包」的干净环境；
源目录里已有别的源时，用加法包 `additive-*.venera`，别用单源包。

## 配置包

| 文件 | 源数 | 用途 |
| --- | --- | --- |
| `仅添加_原始包+TOONTOP+MANGA18FX_VeneraX（基于Next新版）.venera` | 54 → 56 | **推荐**。以原始 54 源包为底稿，只追加两个源，不动原有数据与 cookie |
| `仅添加_原始包+TOONTOP+MANGA18FX_Venera通用版.venera` | 54 → 56 | 同上，带 `manifest.json` |
| `venera-sources_VeneraX（基于Next新版）.venera` | 2 | 只要这两个源，**会清空其它源** |
| `venera-sources_Venera通用版.venera` | 2 | 同上 |
| `TOONTOP-single-VeneraX.venera` / `MANGA18FX-single-VeneraX.venera` | 1 | 单源包，**会清空其它源** |
| `TOONTOP-single-universal.venera` / `MANGA18FX-single-universal.venera` | 1 | 同上，带 `manifest.json` |

`manifest.json` 里的文件清单已按包内实际内容重写，不再残留原始 54 源的文件名。

也能从 Release 下载同样内容：
`https://github.com/wxcdxmn/venera-sources/releases/latest`

## 更新

jsDelivr 对 `@main` 有最长 12 小时缓存，改完文件需要手动清：

```
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/toontop.js
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/m18.js
# purge 返回 finished 不代表边缘已刷新，可用 fastly.jsdelivr.net 对照验证
```

版本号写在 `index.json` 与各 js 的 `version` 字段，两边要一起改，App 才会提示更新。

发版流程：

1. 改 `toontop/toontop.js` 或 `m18/m18.js` 并升 `version`
2. 同步到 `combined/`，改 `index.json` 的版本
3. `python venera_pkg/build_additive.py`、`python combined/build_combined.py`、`python combined/build_single.py`、`python venera_pkg/build_venera.py`、`python m18/build_pkg_m18.py` 重打包
4. 提交推送 + 打新 tag + 建 Release + purge jsDelivr

## 目录

```
index.json     两个源的索引（name / fileName / key / version / description）
toontop.js     TOONTOP 源
m18.js         MANGA18FX 源
*.venera       配置包（加法版 / 2 源 / 单源），供 VeneraX 直接导入
build_single.py  单源包生成脚本（manifest 按实际内容重写）
```

## 说明

本项目仅做页面结构解析，不存储、不分发任何内容；图文版权归原站与原作者所有。
