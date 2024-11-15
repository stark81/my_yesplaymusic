<br />
<p align="center">
  <a href="https://music.qier222.com" target="blank">
    <img src="images/logo.png" alt="Logo" width="156" height="156">
  </a>
  <h2 align="center" style="font-weight: 600">YesPlayMusic</h2>

  <p align="center">
    高颜值的第三方网易云播放器
    <br />
    <a href="https://music.qier222.com" target="blank"><strong>🌎 访问DEMO</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="#%EF%B8%8F-安装" target="blank"><strong>📦️ 下载安装包</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="https://t.me/yesplaymusic" target="blank"><strong>💬 加入交流群</strong></a>
    <br />
    <br />
  </p>
</p>

[![Library][library-screenshot]](https://music.qier222.com)

==========================================================================
## 推广
- 本项目使用低版本的node、低版本electron，导致某些功能，如Linux下的桌面歌词体验不佳；
- 本地音乐的匹配问题。项目集成的express + NeteaseCloudMusicApi无法使用search_match这个API(本地音乐匹配线上信息)，每次使用都只显示参数错误，导致本项目的本地歌曲只能使用“搜索 + 筛选”的方式(该方式增加搜索间隔来避免搜索功能被封)来进行匹配，效率低下；
- 更新API的依赖后，由于未知bug导致掉登陆，即登陆后几分钟内便会自动登出（自动登出不会导致封号）；
- 基于以上几个原因，在解决掉登陆的问题之前，本人将暂停本项目的更新，转而维护自己开发的另一个项目：[VutronMusic](https://github.com/stark81/VutronMusic)。其他用户如果发现本项目掉登陆的原因，请提issue或者pull request，本人会尽快更新处理。
  - 该项目使用vue3 + ts + better-sqlite3 + fastify + pinia + electron32+进行开发，且可快速进行electron版本更新，以保障用户体验；
  - 该项目暂时仅支持客户端，不会像YesPlayMusic一样支持web端，因此无法实现Vercel部署、服务器部署等功能。如果需要可以自行fork后进行修改；
  - UI界面和功能大量【参考和复用】[YesPlayMusic](https://github.com/qier222/YesPlayMusic)，延续了YesPlayMusic的美观和优雅；
  - 对本地音乐的支持更为强大，包括但不限于：①支持读取本地歌曲内嵌歌词、封面、音量平衡信息等；②离线歌单封面支持读取本地歌曲内嵌封面；③使用匹配API进行歌曲匹配，匹配结果快速准确；等等。
  - 使用虚拟列表以减少内存占用、提高性能；
  - UnblockNeteaseMusic解锁更为稳定；
  - 等等。

## 特性✨
 - 新增歌曲评论功能，包括：查看评论、发表评论、回复评论、点赞等。注：因未对歌曲本身进行校验，因此可能会出现评论失败的情况(且没有失败提示)；
 - 针对Mac系统，增加了状态栏歌词显示，包括：独立控制歌词、控制按钮等显示；
 - 新增了桌面歌词功能；
 - 新增本地歌词播放功能，包括：①本地歌曲扫描、播放、在线匹配封面、歌词等；②离线歌单功能等；
## 说明
 - 在本仓库的wiki中新增了部分功能简介，以及播放器异常的处理；
 - 此版本在YesPlayMusic[官方代码](https://github.com/qier222/YesPlayMusic/)0.4.7版本进行的功能调整，可直接访问官方仓库获取原版软件；
 - 此版本并没有屏蔽原代码里的更新检查，如果更新的话应该会被官方版本覆盖；
 - 当前README内的交流群是原作者所留；
 - 当前代码仅学习使用，请勿用于其他用途。如有侵权，请联系删除。
 - 请按照安装部署章节中的【配置开发环境】进行配置：
 ## 其他
 - <font color=orange>M芯片的Mac电脑</font>需要自行打包, 之前打包好的M芯片版本都无法使用。打包的具体步骤参考<font color=orange>《打包客户端》</font>；
 - 如果M芯片自己打包出来的客户端的状态栏歌词位置偏下的话，可以修改<font color=orange>src/utils/trayCanvas.js</font>代码里最后一个draw()函数的<font color=orange>“this.ctx.fillText(this.lyric.text, x, this.canvas.height / 2 + 1);”</font>里的+1，直接将其删除，或者根据自己的实际情况调整即可；
 - 自行打包客户端时，请先切换至<font color=orange>0.4.14及以后的代码</font>，或者切换到<font color=orange>0.4.7的代码</font>来安装依赖(中间版本的代码有的依赖版本有问题，会导致依赖安装不上或者打包出来的程序出现bug)，安装依赖后再切换至最新的代码进行打包；
 - 如果播放器出现问题，可以进入开发者模式，使用<font color=orange>resetPlayer()重置播放器状态</font>。若问题仍未解决，则先在设置里导出本地歌曲信息后再通过开发者模式使用<font color=orange>resetApp()重置软件</font>；

## 截图

![comment][comment-screenshot]
![floor][floor-screenshot]
![tray][trayLyric-screenshot]
![localMusic][localMusic-screenshot]
![localPlaylist][localPlaylist-screenshot]

==========================================================================

## 全新版本
全新2.0 Alpha测试版已发布，欢迎前往 [Releases](https://github.com/qier222/YesPlayMusic/releases) 页面下载。
当前版本将会进入维护模式，除重大bug修复外，不会再更新新功能。

## ✨ 特性

- ✅ 使用 Vue.js 全家桶开发
- 🔴 网易云账号登录（扫码/手机/邮箱登录）
- 📺 支持 MV 播放
- 📃 支持歌词显示
- 📻 支持私人 FM / 每日推荐歌曲
- 🚫🤝 无任何社交功能
- 🌎️ 海外用户可直接播放（需要登录网易云账号）
- 🔐 支持 [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server#音源清单)，自动使用[各类音源](https://github.com/UnblockNeteaseMusic/server#音源清单)替换变灰歌曲链接 （网页版不支持）
  - 「各类音源」指默认启用的音源。
  - YouTube 音源需自行安装 `yt-dlp`。
- ✔️ 每日自动签到（手机端和电脑端同时签到）
- 🌚 Light/Dark Mode 自动切换
- 👆 支持 Touch Bar
- 🖥️ 支持 PWA，可在 Chrome/Edge 里点击地址栏右边的 ➕ 安装到电脑
- 🟥 支持 Last.fm Scrobble
- ☁️ 支持音乐云盘
- ⌨️ 自定义快捷键和全局快捷键
- 🎧 支持 Mpris
- 🛠 更多特性开发中

## 📦️ 安装

Electron 版本由 [@hawtim](https://github.com/hawtim) 和 [@qier222](https://github.com/qier222) 适配并维护，支持 macOS、Windows、Linux。

访问本项目的 [Releases](https://github.com/qier222/YesPlayMusic/releases)
页面下载安装包。

- macOS 用户可以通过 Homebrew 来安装：`brew install --cask yesplaymusic`

- Windows 用户可以通过 Scoop 来安装：`scoop install extras/yesplaymusic`

## ⚙️ 部署至 Vercel

除了下载安装包使用，你还可以将本项目部署到 Vercel 或你的服务器上。下面是部署到 Vercel 的方法。

本项目的 Demo (https://music.qier222.com) 就是部署在 Vercel 上的网站。

[![Powered by Vercel](https://www.datocms-assets.com/31049/1618983297-powered-by-vercel.svg)](https://vercel.com/?utm_source=ohmusic&utm_campaign=oss)

1. 部署网易云 API，详情参见 [Binaryify/NeteaseCloudMusicApi](https://neteasecloudmusicapi.vercel.app/#/?id=%e5%ae%89%e8%a3%85)
   。你也可以将 API 部署到 Vercel。

2. 点击本仓库右上角的 Fork，复制本仓库到你的 GitHub 账号。

3. 点击仓库的 Add File，选择 Create new file，输入 `vercel.json`，将下面的内容复制粘贴到文件中，并将 `https://your-netease-api.example.com` 替换为你刚刚部署的网易云 API 地址：

```json
{
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://your-netease-api.example.com/:match*"
    }
  ]
}
```

4. 打开 [Vercel.com](https://vercel.com)，使用 GitHub 登录。

5. 点击 Import Git Repository 并选择你刚刚复制的仓库并点击 Import。

6. 点击 PERSONAL ACCOUNT 旁边的 Select。

7. 点击 Environment Variables，填写 Name 为 `VUE_APP_NETEASE_API_URL`，Value 为 `/api`，点击 Add。最后点击底部的 Deploy 就可以部署到
   Vercel 了。

## ⚙️ 部署到自己的服务器

除了部署到 Vercel，你还可以部署到自己的服务器上

1. 部署网易云 API，详情参见 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
2. 克隆本仓库

```sh
git clone --recursive https://github.com/qier222/YesPlayMusic.git
```

3. 安装依赖

```sh
yarn install

```

4. （可选）使用 Nginx 反向代理 API，将 API 路径映射为 `/api`，如果 API 和网页不在同一个域名下的话（跨域），会有一些 bug。

5. 复制 `/.env.example` 文件为 `/.env`，修改里面 `VUE_APP_NETEASE_API_URL` 的值为网易云 API 地址。本地开发的话可以填写 API 地址为 `http://localhost:3000`，YesPlayMusic 地址为 `http://localhost:8080`。如果你使用了反向代理 API，可以填写 API 地址为 `/api`。

```
VUE_APP_NETEASE_API_URL=http://localhost:3000
```

6. 编译打包

```sh
yarn run build
```

7. 将 `/dist` 目录下的文件上传到你的 Web 服务器

## ⚙️ Docker 部署（Yesplaymusic原版）

1. 构建 Docker Image

```sh
docker build -t yesplaymusic .
```

2. 启动 Docker Container

```sh
docker run -d --name YesPlayMusic -p 80:80 yesplaymusic
```

3. Docker Compose 启动

```sh
docker-compose up -d
```

YesPlayMusic 地址为 ``

## ⚙️ Docker 部署（适用于由Dnyo666构建的docker版）

1.拉取 Docker Image（可指定版本）

```sh
docker pull dnyo666/my_yesplaymusic:v0.4.16-3
```

2.运行Docker（将80端口映射到3001，可自定义）

```sh
docker run -d --name My_YesPlayMusic -p 3001:80 dnyo666/my_yesplaymusic:v0.4.16-3
```

3.打开My_YesPlayMusic

浏览器输入：http://localhost:3001 成功进入

## ⚙️ 部署至 Replit

1. 新建 Repl，选择 Bash 模板

2. 在 Replit shell 中运行以下命令

```sh
bash <(curl -s -L https://raw.githubusercontent.com/qier222/YesPlayMusic/main/install-replit.sh)
```

3. 首次运行成功后，只需点击绿色按钮 `Run` 即可再次运行

4. 由于 replit 个人版限制内存为 1G（教育版为 3G），构建过程中可能会失败，请再次运行上述命令或运行以下命令：

```sh
cd /home/runner/${REPL_SLUG}/music && yarn installl && yarn run build
```

## 👷‍♂️ 打包客户端

如果在 Release 页面没有找到适合你的设备的安装包的话，你可以根据下面的步骤来打包自己的客户端。

1. 打包 Electron 需要用到 Node.js 和 Yarn。可前往 [Node.js 官网](https://nodejs.org/zh-cn/) 下载安装包。安装 Node.js
   后可在终端里执行 `npm install -g yarn` 来安装 Yarn。

2. 使用 `git clone --recursive https://github.com/qier222/YesPlayMusic.git` 克隆本仓库到本地。

3. 使用 `yarn install` 安装项目依赖。

4. 复制 `/.env.example` 文件为 `/.env` 。

5. 选择下列表格的命令来打包适合的你的安装包，打包出来的文件在 `/dist_electron` 目录下。了解更多信息可访问 [electron-builder 文档](https://www.electron.build/cli)

| 命令                                       | 说明                      |
| ------------------------------------------ | ------------------------- |
| `yarn electron:build --windows nsis:ia32`  | Windows 32 位             |
| `yarn electron:build --windows nsis:arm64` | Windows ARM               |
| `yarn electron:build --linux deb:armv7l`   | Debian armv7l（树莓派等） |
| `yarn electron:build --macos dir:arm64`    | macOS ARM                 |

## :computer: 配置开发环境

本项目由 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 提供 API。

运行本项目

```shell
# 安装依赖
yarn install

# 创建本地环境变量
cp .env.example .env

# 运行（网页端）
yarn serve

# 运行（electron）
yarn electron:serve
```

本地运行 NeteaseCloudMusicApi，或者将 API [部署至 Vercel](#%EF%B8%8F-部署至-vercel)

```shell
# 运行 API （默认 3000 端口）
yarn netease_api:run
```

## ☑️ Todo

查看 Todo 请访问本项目的 [Projects](https://github.com/qier222/YesPlayMusic/projects/1)

欢迎提 Issue 和 Pull request。

## 📜 开源许可

本项目仅供个人学习研究使用，禁止用于商业及非法用途。

基于 [MIT license](https://opensource.org/licenses/MIT) 许可进行开源。

## 灵感来源

API 源代码来自 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)

- [Apple Music](https://music.apple.com)
- [YouTube Music](https://music.youtube.com)
- [Spotify](https://www.spotify.com)
- [网易云音乐](https://music.163.com)

## 🖼️ 截图

![lyrics][lyrics-screenshot]
![library-dark][library-dark-screenshot]
![album][album-screenshot]
![home-2][home-2-screenshot]
![artist][artist-screenshot]
![search][search-screenshot]
![home][home-screenshot]
![explore][explore-screenshot]

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[album-screenshot]: images/album.png
[artist-screenshot]: images/artist.png
[explore-screenshot]: images/explore.png
[home-screenshot]: images/home.png
[home-2-screenshot]: images/home-2.png
[lyrics-screenshot]: images/lyrics.png
[library-screenshot]: images/library.png
[library-dark-screenshot]: images/library-dark.png
[search-screenshot]: images/search.png
[comment-screenshot]: images/comment.png
[floor-screenshot]: images/floor.png
[trayLyric-screenshot]: images/statusBarLyric.png
[localMusic-screenshot]: images/localMusic.png
[localPlaylist-screenshot]: images/localPlaylist.png
