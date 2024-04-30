import { withScopedCSS } from '@viewfly/scoped-css'
import { onMounted, onUnmounted, StaticRef, watch } from '@viewfly/core'
import { useProduce } from '@viewfly/hooks'

import css from './selection-mask.scoped.scss'
import { TableComponent } from '../table.component'
import { sum } from '../_utils'
import { delay } from '@textbus/core'

export interface TableSelection {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export interface SelectionMaskProps {
  component: TableComponent
  tableRef: StaticRef<HTMLTableElement>
}

export function SelectionMask(props: SelectionMaskProps) {
  const [styles, updateStyles] = useProduce({
    visible: false,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 'auto',
    height: 'auto'
  })
  onMounted(() => {
    update()
  })

  watch(props.component.tableSelection, update)

  function update() {
    const selection = props.component.tableSelection()
    const state = props.component.state
    if (selection) {
      let topCompensation = 0.5
      let heightCompensation = -1
      if (selection.startRow === 0) {
        topCompensation = 0
        heightCompensation = -0.5
      }
      if (selection.startRow > 0) {
        heightCompensation = -1
      }
      if (selection.endRow === state.rows.length) {
        heightCompensation += 0.5
      }
      const trs = Array.from(props.tableRef.current!.rows)
      updateStyles(draft => {
        draft.visible = true
        draft.left = sum(state.layoutWidth.slice(0, selection.startColumn))
        draft.top = sum(trs.slice(0, selection.startRow).map(i => i.offsetHeight)) + topCompensation
        draft.width = sum(state.layoutWidth.slice(selection.startColumn, selection.endColumn)) - 1 + 'px'
        draft.height = sum(trs.slice(selection.startRow, selection.endRow).map(i => i.offsetHeight)) + heightCompensation + 'px'
      })
    } else {
      updateStyles(draft => {
        draft.visible = false
      })
    }
  }

  const s = props.component.changeMarker.onChange.pipe(delay(1)).subscribe(() => {
    update()
  })

  onUnmounted(() => {
    s.unsubscribe()
  })
  return withScopedCSS(css, () => {
    const style = styles()
    return (
      <div class="mask" style={{
        display: style.visible ? 'block' : 'none',
        left: style.left + 'px',
        top: style.top + 'px',
        right: style.right + 'px',
        width: style.width,
        height: style.height,
        bottom: style.bottom + 'px'
      }}/>
    )
  })
}
