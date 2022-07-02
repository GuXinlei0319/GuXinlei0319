import { isObject } from "@vue/shared"
import { activeEffect, track, trigger } from "./effect"
import { reactive } from "./reactive"

// ts枚举标识符
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export const multableHandles = {

  // 取值的时候依赖收集 
  get(target, key, receiver) {
    // 如果访问的是标识符，返回true，reactive返回target本身
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    // activeEffect --> key 关联
    track(target,'get',key)
      
    // Reflect反射改变调用取值时的this指向，可以监控到用户get属性访问器的取值
    let res = Reflect.get(target, key, receiver)
    if(isObject(res)){
      return reactive(res) // 深度代理实现 深度代理对象 性能好 取值就代理
    }
    return res
  },

  // 更新的时候重新渲染
  set(target, key, value, receiver) {
    let oldValue = target[key]
    let result = Reflect.set(target, key, value, receiver)
    if(oldValue != value){ // 值变化了，要更新
      trigger(target,'set',key,value,oldValue)
    }

    //直接返回是否设置成功
    return result //直接返回是否设置成功
  }

}

// 对象 某个属性 对应 多个effect
// WeakMap = { key-对象：value-Map对象{[key-name]:[value-Set]}  }
// map{[key对象]：{name：[]}}
// Set类似数组，但是成员唯一不重复，