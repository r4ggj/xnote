import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  createVNode,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext, useDynamicShortcut,
  ZenCodingGrammarInterceptor
} from '@textbus/core'
import { ComponentLoader, DomAdapter, SlotParser } from '@textbus/platform-browser'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'

import './todolist.component.scss'
import { ParagraphComponent } from '../paragraph/paragraph.component'
import { textIndentAttr } from '../../attributes/text-indent.attr'
import { strikeThroughFormatter } from '../../formatters/strike-through'

export interface TodolistComponentState {
  checked: boolean
  slot: Slot
}

export class TodolistComponent extends Component<TodolistComponentState> {
  static type = ContentType.BlockComponent
  static componentName = 'TodoListComponent'
  static zenCoding: ZenCodingGrammarInterceptor<TodolistComponentState> = {
    match: /^\[(x|\s)?\]$/,
    key: ' ',
    createState(content: string): TodolistComponentState {
      const isChecked = content.charAt(1) === 'x'
      return {
        checked: isChecked,
        slot: new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ])
      }
    }
  }

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<TodolistComponentState>) {
    const slot = textbus.get(Registry).createSlot(json.slot)
    return new TodolistComponent(textbus, {
      slot,
      checked: json.checked
    })
  }

  override setup() {
    const textbus = useContext()
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    onBreak(ev => {
      const slot = ev.target.cut(ev.data.index)
      if (ev.target.isEmpty && slot.isEmpty) {
        const beforeIndex = this.parent!.indexOf(this)
        const beforeComponent = this.parent!.getContentAtIndex(beforeIndex - 1)
        if (beforeComponent instanceof TodolistComponent) {
          const nextComponent = new ParagraphComponent(textbus, {
            slot: new Slot([
              ContentType.Text,
              ContentType.InlineComponent
            ])
          })
          nextComponent.state.slot.insertDelta(slot.toDelta())
          commander.insertAfter(nextComponent, this)
          commander.removeComponent(this)
          selection.setPosition(nextComponent.state.slot, 0)
          ev.preventDefault()
          return
        }
      }
      const nextParagraph = new TodolistComponent(textbus, {
        checked: this.state.checked,
        slot
      })
      commander.insertAfter(nextParagraph, this)
      selection.setPosition(slot, 0)
      ev.preventDefault()
    })

    useDynamicShortcut({
      keymap: {
        key: 'Backspace'
      },
      action: (): boolean | void => {
        if (!selection.isCollapsed || selection.startOffset !== 0) {
          return false
        }
        const slot = selection.commonAncestorSlot!.cut()
        const paragraph = new ParagraphComponent(textbus, {
          slot
        })
        commander.replaceComponent(this, paragraph)
        selection.setPosition(slot, 0)
      }
    })
  }
}

export function TodolistView(props: ViewComponentProps<TodolistComponent>) {
  const adapter = inject(DomAdapter)
  const state = props.component.state

  function toggle() {
    state.checked = !state.checked
    state.slot.applyFormat(strikeThroughFormatter, {
      startIndex: 0,
      endIndex: state.slot.length,
      value: state.checked ? true : null
    })
  }

  return () => {
    const { slot, checked } = state
    const indent = slot.getAttribute(textIndentAttr) || 0
    return (
      <div data-component={TodolistComponent.componentName} ref={props.rootRef} class="xnote-todolist" style={{
        marginLeft: indent * 24 + 'px'
      }}>
        <div class="xnote-todolist-icon" onClick={toggle}>
          <span data-checked={checked} class={[checked ? 'xnote-icon-checkbox-checked' : 'xnote-icon-checkbox-unchecked']}/>
        </div>
        {
          adapter.slotRender(slot, children => {
            return createVNode('div', {
              class: 'xnote-todolist-content'
            }, children)
          }, false)
        }
      </div>
    )
  }
}

export const todolistComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === TodolistComponent.componentName
  },
  read(element: HTMLElement, injector: Textbus, slotParser: SlotParser): Component | Slot {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ]), element.children[1] as HTMLElement)
    return new TodolistComponent(injector, {
      checked: element.children[0]!.hasAttribute('checked'),
      slot
    })
  }
}
