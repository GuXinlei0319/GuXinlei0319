
// 导出的变化后的activeEffect变量，存储
export let activeEffect = undefined

function cleanupEffect(effect) {
  // effect.deps = [] 只是把数组清空，不管用
  const { deps } = effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect) // 解除Set里的effect，重新依赖收集
  }
  effect.deps.length = 0
}

// 拓展effect，类，响应式的effect函数，数据变化，重新执行fn回调函数
export class ReactiveEffect {
  public active = true; // effect默认是激活状态
  public parent = null; // 监控key与effect对应的属性，防止多个effect记录出错(组件嵌套)
  public deps = [];     // 收集依赖的哪些属性

  // 用户传递的参数也会放到this上，this.fn = fn
  constructor(public fn, public scheduler) { }

  // run就是执行effect
  run() {
    // 非激活状态时，只需要执行函数，不需要进行依赖收集
    if (!this.active) { return this.fn() }

    // 依赖收集 核心：将当前的effect和稍后渲染的属性关联起来
    try {
      this.parent = activeEffect
      activeEffect = this // --> 类：active属性和fn属性(回调函数)    

      // 需要的执行用户的函数之前将 之前收集的deps[]内容清空
      cleanupEffect(this) // 删除，this.fn()加上，死循环

      return this.fn()    // 当稍后的调用取值操作的时候，就可以获取到这个全局的activeEffect
    } finally {
      activeEffect = this.parent // 还原activeEffect
      this.parent = null // 清空（可不清空）
    }
  }

  stop() {
    if (this.active) {
      this.active = false // 改变状态
      cleanupEffect(this) // 停止收集
    }

  }
}

export function effect(fn, options: any = {}) {
  // fn:用户传入的回调函数。可以根据数据状态变化重新执行，effect可以嵌套写(组件)



  // 创建一个类，响应式的effect，数据变化，重新执行fn回调函数
  const _effect = new ReactiveEffect(fn, options.scheduler)

  // 传入的回调函数，默认先执行一次
  _effect.run()

  // 返回runnner()函数，effect重新执行
  const runner = _effect.run.bind(_effect) // 赋值并绑定this指向
  runner.effect = _effect // 将effect挂载到runner函数上
  return runner

}

// 数据格式 依赖收集 关联key和activeEffect 
// 一个effect对应多个属性，一个属性对应多个effect --> 多对多
// 单向记录-->属性记录了effect
// 反向记录-->应该让effect也记录它被哪些属性收集，好处是可以清理effect（分支控制） 
// eg：effect(()=>{ flag ? this.name : this.age })每次执行effect之前清理属性关联的effect依赖
// WeakMap = { key-对象：value-Map对象{[key-name]:[value-Set]，[key-age]:[value-Set]，[key-address]:[value-Set]} }
const targetMap = new WeakMap()
export function track(target, type, key) {
  // debugger
  // 如果没有在effect取值，没有调用effect，直接返回
  if (!activeEffect) return;

  // targetMap（WeakMap对象）里有没有target对象对应的值-Map对象
  let depsMap = targetMap.get(target)
  if (!depsMap) { // 第一次没有，进行设置
    targetMap.set(target, (depsMap = new Map()))
  }

  // desMap（Map对象）里有没有key属性 对应的值-Set
  let dep = depsMap.get(key)
  if (!dep) { // 如果没有，进行设置
    depsMap.set(key, (dep = new Set()))
  }

  // 一个effect里使用多次统一属性 
  // dep里有没有activeEffect属性，如果没有，要收集
  trackEffects(dep)
}

export function trackEffects(dep) {
  // 一个effect里使用多次统一属性 
  // dep里有没有activeEffect属性，如果没有，要收集
  if (activeEffect) {
    let ShouldTrack = !dep.has(activeEffect) //判断有无、去重
    if (ShouldTrack) {
      dep.add(activeEffect)
      activeEffect.deps.push(dep) // 记录属性对应的-Set ReactiveEffect
    }
  }
}

export function trigger(target, type, key, value, oldValue) {
  // 查找target对应的Map对象
  // debugger
  const depsMap = targetMap.get(target)
  if (!depsMap) return; // 触发的值不在模板中使用，返回

  let effects = depsMap.get(key) // 找到了属性对应的effect集合，new Set()也是有值的，为true

  // 永远在执行之前，先拷贝一份来执行，不要关联引用
  if (effects) {
    triggerEffects(effects)
  }

}

export function triggerEffects(effects) {
  effects = new Set(effects) // 拷贝，不然死循环
  effects.forEach(effect => {
    // 当执行effect时，effect的会点函数里数据变化，又要执行自己(可能死循环)，需要屏蔽掉，不要无限调用，走了屏蔽掉
    // effect没执行完，又再里面放入effect，之前的effect没执行完，不会重置为undefined
    // 结果不是14，因为重新渲染，调用effect，执行random，又重新渲染了
    // 出现几次，调用几次, 更新值，重新执行effect
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler() // 如果用户传入了调度函数，则用用户的
      } else {
        effect.run()  // 否则默认刷新视图，执行effect
      }
    }
  });
}

// let s = new Set([])  s===new Set(s)   -->false
// 连续多次Set，怎么合并？

// vue2没有用map，用的watcher和数组

// vue3.0 [e1,e2] 栈默认存储e1 ， e2操作执行完，之后出栈， address --> e1
// 属性关联栈中的最后一个
// effect(()=>{ // e1
//   state.name  // name --> e1 
//   effect(()=>{ // e2
//     state.age // age --> e2
//   })
//   state.address // address --> undefined  |-> e1
// })
// 新版本：这个执行流程 类似树形结构 记录 parent，做一个标记
// effect(()=>{ // parent = null; activeEffect = e1
//   state.name  // name --> e1 
//   effect(()=>{ // parent = e1; activeEffect = e2
//     state.age // age --> e2
//   })
//   state.address // activeEffect = this.parent -->e1
// })

// 小节   watch、组件、computed、渲染相关都是基于effect，类似vue2的watcher
// 1) 创建响应式对象 new Proxy
// 2) 响应式effect，默认数据变化要更新，先把正在执行的effect作为全局变量，
//    渲染(取值)，在get方法中进行依赖收集。
// 3) 收集过程的数据结构 WeakMap = { target原对象 : Map对象{key:newSet,key:newSet,key:newSet...}}
// 4) 稍后用户发生数据变化，会通过对象属性来查找对应的effect集合，找到的effect全部执行

