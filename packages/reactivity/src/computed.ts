import { isFunction } from "@vue/shared"
import { activeEffect, ReactiveEffect, track, trackEffects, triggerEffects } from "./effect"

class ComputedRefImpl {
  public effect
  public _dirty = true // 默认取值的时候需要计算
  public __v_isReadonly = true
  public __v_isRef = true
  public _value // 操作的公共属性
  public dep = new Set()

  constructor(getter, public setter) {
    // 我们将用户的getter放入effect，用户写入的firstName和lastName就会被effect收集起来
    this.effect = new ReactiveEffect(getter, () => {
      // 稍后依赖的用户的属性变化，就会触发执行scheduler调度函数
      if (!this._dirty) { 
        this._dirty = true 
        
        // 依赖变化，实现一个触发更新--> Proxy里的get、set
        triggerEffects(this.dep)
      }

    })
  }

  // 类中的属性访问器，底层就是Object.defineProperty
  // 继承远比组合更不容易管理，不能实现多继承，组合(函数式)由于继承
  get value() {

    // 做依赖收集
    trackEffects(this.dep)

    // 关联effect，取值时，返回结果
    if (this._dirty) {
      this._dirty = false // 多次取值，只有第一次进入循环，只有依赖的属性变化，才能再次进入
      this._value = this.effect.run() // 执行用户传入的fn，fn返回的值作为结果
    }

    return this._value
  }
  set value(newValue) {
    this.setter(newValue)
  }

}

export const computed = (getterOptions) => {
  let onlyGetter = isFunction(getterOptions)
  let getter
  let setter

  if (onlyGetter) {
    getter = getterOptions
    setter = () => { console.warn('no set') }
  } else {
    getter = getterOptions.get
    setter = getterOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}