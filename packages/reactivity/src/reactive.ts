import { isObject } from "@vue/shared";
import { multableHandles, ReactiveFlags } from './baseHandles'

// WeakMap弱引用，key只能为对象，不会内存泄漏
const reactiveMap = new WeakMap();

// 1) 实现同一个对象，代理多次，返回同一个代理
// 2) 代理对象被再次代理，可以直接返回
export function reactive(target) {

  // 不是对象，直接退出 
  if (!isObject(target)) {
    return
  }

  // 取值操作，如果是代理对象，命中get方法，普通对象没有get
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  // 防止多个代理对象映射同一个对象,存储映射表,常用的缓存机制，如果有直接返回取到的proxy
  let exisitingProxy = reactiveMap.get(target)
  if (exisitingProxy) {
    return exisitingProxy
  }

  // 创建proxy代理对象
  const proxy = new Proxy(target, multableHandles)

  // 把代理对象和原对象关联起来，原对象为key，代理对象为value
  reactiveMap.set(target, proxy)

  return proxy
}

