// 解析命令行 "dev": "node scripts/dev.js reactivity -f global"参数 
// minimist写脚手架用到，传入命令行进程的参数，并解析参数
const args = require('minimist')(process.argv.slice(2))
const {resolve} = require('path'); // node中的内置模块
const {build} = require('esbuild')
// 主流开发esbuild  打包rollup（打包各种各式，支持各种转换）

// console.log(args) 
// { _: [ 'reactivity' ], f: 'global' }
// 打包的模块和格式format，下划线默认为模块

const target = args._[0] || 'reactivity'; // 源码vue
const format = args.f || 'global'; 

// 可以同时打包多个，开发环境只打包某一个 找到每个包的package.json
// __dirname 当前目录
const pkg = require(resolve(__dirname,`../packages/${target}/package.json`))

// 输出格式 是否global，是转成iife（代表立即执行函数）
// iife 立即执行函数   (function(){})()
// cjs node中的模块    module.exports
// esm 浏览器中的esModule模块    import
const outputFormat = format.startsWith('global')?'iife':format === 'cjs'?'cjs' :'esm'

// 打包输出文件 路径 和 名称
const outfile = resolve(__dirname,`../packages/${target}/dist/${target}.${format}.js`)

// esbuild 天生支持ts
build({
  // 入口点
  entryPoints:[resolve(__dirname,`../packages/${target}/src/index.ts`)],
  outfile, // 输出文件
  bundle:true, // 把所有的包全部打包到一起
  sourcemap:true, // 打包时需要有sourcemap
  format:outputFormat, //输出的格式
  globalName:pkg.buildOptions?.name, //打包的全局的名字
  platform:format === 'cjs'?'node':'browser', //平台是node还是浏览器
  watch:{ // 监听文件变化，告诉需要重新构建
    onRebuild(error){
      if(!error) console.log('rebuild~~~') 
    }
  }
}).then(()=>{
  console.log('watching~~~') // 打包成功，监控中
})