import { isObject } from "@vue/shared";

// WeakMap不会导致内存泄漏，弱引用，key只能是对象
const reactiveMap = new WeakMap();

// 创建枚举标识,一组标识符，没用symbol
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}


// 将数据转换成响应式数据,reactive只能做对象的代理
// 1）实现同一个对象，代理多次，返回同一个代理
// 2）代理对象被再次代理，可以直接返回
export function reactive(target: any) {

  // debugger

  // 不是对象，直接退出
  if (!isObject(target)) {
    return
  }

  //   const state3 = reactive(data)
  //   const state4 = reactive(state3)
  //   console.log(state3 === state4) // false
  // 第一次代理普通对象，new Proxy一次
  // 第二次传递的proxy，查看是否代理过，如果访问这个proxy，有get方法说明代理过
  // 不能自定义属性 proxy.xxx 触发一次set，用户打印也会看到，不合理
  // 此处取值操作，如果是代理对象，命中（调用）get方法，普通对象没有get
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  //   const state1 = reactive(data)
  //   const state2 = reactive(data)
  //   console.log(state1 === state2)
  // 防止多个代理对象映射同一个对象,常用的缓存机制，存储映射表
  let exisitingProxy = reactiveMap.get(target)
  if (exisitingProxy) {
    return exisitingProxy
  }

  // proxy代理对象
  // 并没有重新定义属性，只是代理，在取值的时候待用get，当复制值的时候待用set
  const proxy = new Proxy(target, {

    // target传入的对象
    // key target的属性
    // receiver当前的代理对象,proxy自己
    // 取值的时候依赖收集
    get(target, key, receiver) {

      // 如果访问的是标识符，返回true
      if (key === ReactiveFlags.IS_REACTIVE) {
        return true
      }

      // 去代理对象上取值，执行get
      // return target[key] // 不能取到调用代理
      // 监控到用户取值
      return Reflect.get(target, key, receiver)
    },

    // value 设置的属性key的值
    // 更新的时候重新渲染
    set(target, key, value, receiver) {
      // 去代理上设置值，执行set
      // target[key] = value
      // return true
      // 监控到用户设置值
      return Reflect.set(target, key, value, receiver) //直接返回是否设置成功
    }
  })
  // 把代理对象和原对象关联起来，把target置为null，proxy自动清空（key，value）
  reactiveMap.set(target, proxy)

  return proxy
}

/**
 * 测试简单写法有问题
 * 全局安装ts-node，run code运行ts程序,选中部分完整的代码运行
 */

/*
let target = {
  name:'18',
  get alias(){   // 属性访问器Object.defineProperty{ get (){} } ES5 可以取当前对象的值，调用取值
    console.log(this,'40-target') // { name: '18', alias: [Getter] }
    // Reflect后此处this不变
    return this.name
  }
}

// target.alias --> name --> '18'

const proxy = new Proxy(target, {
  get(target,key,receiver) {
    // console.log(key) //alias
    // console.log(this,'51-proxy') // { get: [Function: get], set: [Function: set] }
    // return target[key]
    // return receiver[key] // 死循环
    // Reflect执行会把代理到的target里的this指向改为代理对象(虚改)，代理对象里又执行到name，执行两次get
    console.log(key,'54-Reflect') // proxy取值 --> alias属性 Reflect target属性执行 --> name
    return Reflect.get(target,key,receiver)
  },
  set(target,key,value,receiver) {
    target[key] = value
    return true
  }
})

// get
// 去alias上取值时，get上取到了alias，但是其中的this指向target而不是代理对象
// 继续运行，取的是target上的name，get上没有监控到name的取值
proxy.alias
// 执行访问alias时，也要收集name，因为alias依赖于name，name变化alias也要变化


// 输出结果不变，但是过程存在问题
// console.log(proxy.alias) //18

// 使用Reflect的原因？
// 如果用get访问属性，属性改变时，代理对象不能取到，用Reflect反射改变调用取值时的this指向(传入的receiver)，取值两次

*/
