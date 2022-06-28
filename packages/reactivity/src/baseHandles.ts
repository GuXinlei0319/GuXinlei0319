import { activeEffect } from "./effect"

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

    
    // Reflect反射改变调用取值时的this指向，可以监控到用户get属性访问器的取值
    return Reflect.get(target, key, receiver)
  },

  // 更新的时候重新渲染
  set(target, key, value, receiver) {
    //直接返回是否设置成功
    return Reflect.set(target, key, value, receiver) //直接返回是否设置成功
  }

}