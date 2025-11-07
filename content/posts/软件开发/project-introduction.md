---
title: "QA Pipeline 项目开发介绍"
date: 2025-11-07T00:00:00+08:00
lastmod: 2025-11-07T00:00:00+08:00
draft: false
author: "QA Pipeline Team"
description: "QA Pipeline 是一个完整的 RAG（检索增强生成）系统，用于处理 PDF 文档的知识抽取、向量化、图谱构建和智能问答。"
tags: ["项目记录"]
categories: ["项目记录"]
weight: 1
hidden: true
---

# QA Pipeline 项目开发介绍

## 项目概述

**QA Pipeline** 是一个基于 Python 的完整 RAG（检索增强生成）系统，专门设计用于处理 PDF 文档的知识抽取、向量化、知识图谱构建和智能问答。系统采用模块化架构，支持从文档清理、分块、索引构建到检索生成的全流程。

### 核心特性

- **多阶段文档处理**: PDF 清理 → 语义分块 → 向量索引 → 知识图谱构建
- **多路检索策略**: Dense (KNN) + Sparse (BM25) + TOC 召回 + Graph 扩展
- **知识图谱增强**: TreeKG 建图策略，支持迭代扩展和边预测
- **独立 TOC 召回通道**: 基于文档结构的独立召回路径
- **多前端支持**: Streamlit（传统）和 NiceGUI（现代化）
- **桌面应用支持**: PyQt 开发包装器和 Electron 生产打包

## 技术架构

### 系统架构图

```
PDF 文档
  ↓
[清理器] - PDF 清理与预处理
  ↓ Markdown
[分块器] - 语义分块 + Capsule 生成
  ↓ Chunks/Segments/Capsules
[索引构建器] - 向量索引构建
[边构建器] - 知识图谱构建
  ↓
[库管理器] - 知识库管理
  ↓
[检索与问答管道] - 多路检索 + 重排 + 生成
```

### 技术栈

**后端核心**:
- Python 3.12+
- NumPy, Pandas - 数据处理
- NetworkX - 图计算
- Sentence Transformers / Ollama - 向量化
- OpenSearch / FAISS - 向量检索
- scikit-learn - 机器学习

**前端框架**:
- Streamlit 1.28+ - 传统 Web UI
- NiceGUI 3.2+ - 现代化前端框架
- PyQt5/PySide6 - 桌面应用包装
- Electron - 跨平台桌面应用

**LLM 支持**:
- Ollama - 本地 LLM
- OpenAI API - GPT 系列
- DeepSeek API
- Kimi API

## 核心模块

### 1. 文档清理器 (`apps/cleaner/`)

**功能**: PDF 文档的清理、预处理和结构化

**主要特性**:
- MinerU 集成：支持 magic-pdf / MinerU 进行 PDF 解析
- 章节管理：手动/自动章节拆分、合并
- 结构清理：标题树构建、引用注册、图表提取
- 编辑功能：文本编辑、搜索替换、撤销重做
- 实时预览：左右分栏编辑器与预览窗口

### 2. 分块器 (`apps/chunker/`)

**功能**: 语义分块 + Capsule 生成

**主要特性**:
- 语义分块：基于语义单元的分块策略
- Capsule 生成：文档级别的语义单元聚合
- TOC 提取：自动提取文档目录结构
- TreeKG 导出：生成知识图谱基础结构

### 3. 索引构建器 (`apps/index_builder/`)

**功能**: 向量索引构建

**主要特性**:
- Dense 索引：使用 Sentence Transformers / Ollama 向量化
- Sparse 索引：BM25 稀疏检索索引
- TOC 向量化：TOC 节点标题+摘要向量化
- 多后端支持：OpenSearch 和 LocalRepo (FAISS)

### 4. 边构建器 (`apps/edge_builder/`)

**功能**: 知识图谱构建

**主要特性**:
- 显式边构建：基于规则的边预测
- 隐式边构建：基于语义相似度的边预测
- TOC 边构建：TOC 节点之间的层级和水平关系
- TreeKG 迭代扩展：6 个操作符（conv, aggr, embed, dedup, pred, merge）

### 5. 库管理器 (`apps/library_manager/`)

**功能**: 知识库管理

**主要特性**:
- 多库管理：支持多个知识库的创建和管理
- 版本控制：知识库版本管理和同步
- 数据一致性检查：自动检查数据完整性
- 导入导出：支持数据导入和导出

### 6. 检索与问答管道 (`apps/streamlit/`)

**功能**: 多路检索 + 重排 + 生成

**主要特性**:
- 多路检索：Dense + Sparse + TOC + Graph
- 动态阈值：基于质量评估的动态候选池选择
- 动态融合权重：基于质量评估的加权融合
- 重排与融合：Cross-Encoder 重排 + 上下文融合
- LLM 生成：支持多种 LLM 提供者

## 检索策略

### 多路检索流程

1. **Dense 检索 (KNN)**: 使用向量相似度检索
2. **Sparse 检索 (BM25)**: 使用关键词匹配检索
3. **TOC 召回**: 基于文档结构的独立召回通道
4. **Graph 扩展**: 基于知识图谱的扩展检索

### 评分与融合

- **原始分数**: 保持各通道的原始评分
- **动态阈值**: 基于质量评估的动态候选池选择
- **动态权重**: 基于质量评估的加权融合
- **归一化融合**: Min-Max / Z-Score 归一化
- **重排**: Cross-Encoder 重排
- **上下文融合**: MMR / Block-First 融合

## 项目结构

```
QA/
├── apps/                    # 应用入口
│   ├── cleaner/            # 清理器
│   ├── chunker/            # 分块器
│   ├── index_builder/      # 索引构建器
│   ├── edge_builder/       # 边构建器
│   ├── library_manager/    # 库管理器
│   └── streamlit/          # Streamlit 应用
├── pipeline_refactored/    # 核心代码
│   ├── pipeline/           # 核心管道
│   ├── pipeline_ui/        # Streamlit UI
│   ├── nicegui_ui/        # NiceGUI UI
│   └── utils/             # 工具函数
├── scripts/                # 启动脚本
├── electron_app/           # Electron 应用
├── docs/                   # 文档
├── config/                 # 配置文件
└── tests/                  # 测试文件
```

## 版本信息

- **当前版本**: v5.4 (NiceGUI 前端迁移)
- **核心版本**: 
  - Chunker: v2.14
  - Index Builder: v2.7
  - Edge Builder: v3.7
  - Library Manager: v2.6

## 快速开始

### 安装依赖

```bash
pip install -r config/requirements.txt
```

### 启动应用

```bash
# Streamlit 应用
./start.sh streamlit

# NiceGUI 应用
./start.sh nicegui

# NiceGUI 开发环境
./start.sh nicegui-dev
```

## 相关文档

- [项目结构说明](../PROJECT_STRUCTURE.md)
- [NiceGUI 迁移指南](nicegui_migration.md)
- [变更日志](../../CHANGELOG.md)
- [快速开始](quick_start/nicegui.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**最后更新**: 2025-11-08

