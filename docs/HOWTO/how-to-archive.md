按以下方式标准归档文件
1. 对 docs/TODO.md 的内容进行分析；
2. 使用当前系统支持的命令修改文件名，文件名格式 TODO-{4位数日期}-{分析的简单总结}.md，然后把文件归档到 docs/todo 下；
3. 然后重新创建一个新的 TODO.md 文档，使其内容为:
```
# 执行计划

包含了人工执行和自动实施的计划。
AI的任务是根据信息，自动实施指定的计划。

## 任务标记说明

HUMAN = 人工，由人类执行
AI = 自动，由 AI 执行

## 规范
- 按 todo 事项理解目标、分析已有代码、给出方案、实现目标
- 完成后，标记对应的任务为[x]
- 在完成的任务下方添加任务执行中遇到的错误与反思

## 任务（顺序执行）
- [ ] AI: 
- [ ] Human:
```