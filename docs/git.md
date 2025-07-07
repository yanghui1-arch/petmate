# 项目git规范
## 分支
一个分支意味着一个更新任务，做完这个任务就提交pr，pr合并后没有问题就删除这个分支
例如：现在有一个任务是 移除所有无用代码
1. 首先创建一个本地分支 `git checkout -b remove-useless-codes`
2. 其次创建一个远程分支 `git push -u origin remove-useless-codes`
3. 写完更新代码后，提交PR，由审核A来合并PR，PR合并后若无问题，则删除该分支即可