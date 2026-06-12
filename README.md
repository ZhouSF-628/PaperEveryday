# PaperEveryday 📄

> 个人论文追踪 Dashboard — 快速跟进研究领域的最新进展。

纯前端静态网页，通过 JSON 文件管理论文，配合 GitHub Actions 自动拉取 ArXiv 最新论文，可部署到 **GitHub Pages**。

---

## ✨ 功能

- **双栏布局**：左侧领域导航，右侧卡片流，信息密度高
- **重要论文管理**：手动添加/编辑/删除关注领域的重要论文卡片
- **论文详情弹窗**：含摘要、💡创新点、📊结果对比三个 Tab
- **ArXiv 自动拉取**：按关键词从 ArXiv 获取最新论文，支持收藏和纳入管理
- **搜索筛选**：按标题/作者/摘要搜索，按重要性/年份排序
- **数据导入导出**：JSON 格式，方便备份和分享
- **响应式设计**：桌面/平板/手机自适应

## 🚀 快速开始


### 部署到 GitHub Pages

1. 将本仓库推送到 GitHub
2. 在仓库 Settings → Pages 中，选择 `main` 分支及根目录
3. 访问 `https://<你的用户名>.github.io/PaperEveryday`

## 📁 项目结构

```
PaperEveryday/
├── index.html              # 主页面
├── css/
│   └── style.css           # 全部样式
├── js/
│   ├── app.js              # 应用入口、状态管理
│   ├── data-manager.js     # JSON 数据加载、CRUD、导入导出
│   ├── renderer.js         # DOM 渲染（卡片、弹窗、侧边栏）
│   └── arxiv.js            # ArXiv API 前端查询
├── data/
│   ├── domains.json        # 领域配置（名称、关键词）
│   ├── papers.json         # 手动管理的重要论文（可编辑）
│   └── latest.json         # ArXiv 自动拉取的最新论文
├── scripts/
│   └── fetch_arxiv.py      # Python 脚本：从 ArXiv 拉取论文
├── .github/workflows/
│   └── fetch-latest.yml    # 每天自动拉取最新论文
└── README.md
```

## 🔧 自定义配置

### 修改关注领域

编辑 `data/domains.json`，添加或修改领域及其关键词：

```json
{
  "id": "my-field",
  "name": "我的领域",
  "icon": "🔬",
  "keywords": ["keyword1", "keyword2"]
}
```

### 添加重要论文

两种方式：
1. 网页中点击右上角「**+ 添加论文**」按钮，填写表单
2. 直接编辑 `data/papers.json` 文件

### 更新 ArXiv 最新论文

- **手动**：在「最新动态」页面点击「**手动刷新**」按钮（浏览器需支持 CORS 代理）
- **自动**：配置好 GitHub Actions 后，每天自动拉取并提交

## 🔄 GitHub Actions 自动拉取

仓库已配置每天 UTC 8:00（北京时间 16:00）自动运行 ArXiv 拉取脚本。

也可在 GitHub 仓库的 Actions 页面手动触发「Fetch Latest ArXiv Papers」工作流。

## 📝 数据格式

每篇论文包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| title | string | 论文标题 |
| authors | string | 作者列表 |
| year | number | 发表年份 |
| venue | string | 会议/期刊 |
| arxivId | string | ArXiv ID |
| abstract | string | 摘要 |
| innovation | string[] | 创新点列表 |
| results | string | 结果对比描述 |
| link | string | 论文链接 |
| domainId | string | 所属领域 ID |
| tags | string[] | 标签 |
| importance | number | 重要性评分 (1-5) |

## 🧪 技术栈

- **前端**：纯 HTML5 + CSS3 + Vanilla JavaScript（零依赖）
- **数据**：JSON 文件（版本可控）+ localStorage（工作区缓存）
- **自动更新**：GitHub Actions + Python 脚本

---

*Made with ❤️ for researchers who want to stay on top of their field.*

