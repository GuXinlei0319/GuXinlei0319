
// 导出的变化后的activeEffect变量，存储
export let activeEffect = undefined 

// 拓展effect，类，响应式的effect函数，数据变化，重新执行fn回调函数
class ReactiveEffect {
  public active = true; // effect默认是激活状态
  // 用户传递的参数也会放到this上，this.fn = fn
  constructor(public fn) {}

  // run就是执行effect
  run() {
    // 非激活状态时，只需要执行函数，不需要进行依赖收集
    if (!this.active) { return this.fn() }

    // 依赖收集 核心：将当前的effect和稍后渲染的属性关联起来
    try {
      activeEffect = this // --> 类：active属性和fn属性(回调函数)    
      return this.fn()    // 当稍后的调用取值操作的时候，就可以获取到这个全局的activeEffect
    } finally {
      activeEffect = undefined
    }
  }

  stop(){
    this.active = false
  }
}

export function effect(fn) {
  // fn:用户传入的回调函数。可以根据数据状态变化重新执行，effect可以嵌套写(组件)

  // 创建一个类，响应式的effect，数据变化，重新执行fn回调函数
  const _effect = new ReactiveEffect(fn)

  // 传入的回调函数，默认先执行一次
  _effect.run()

}


// [e1,e2] 栈默认存储e1 ， e2操作进栈，之后出栈， address --> e1
// 属性关联栈中的最后后一个
// effect(()=>{ // e1
//   state.name  // name --> e1 
//   effect(()=>{ // e2
//     state.age // age --> e2
//   })
//   state.address // address --> undefined  |-> e1
// })