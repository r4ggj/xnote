import { useProduce } from '@viewfly/hooks'
import { inject, onUnmounted } from '@viewfly/core'
import { Selection } from '@textbus/core'

import { Button } from '../../../components/button/button'
import { RefreshService } from '../../../services/refresh.service'
import { TableComponent } from '../../../textbus/components/table/table.component'

export function MergeCellsTool() {
  const refreshService = inject(RefreshService)
  const selection = inject(Selection)

  const [viewModel, update] = useProduce({
    highlight: false,
    disabled: false,
  })

  function merge() {
    const commonAncestorComponent = selection.commonAncestorComponent
    if (commonAncestorComponent instanceof TableComponent) {
      const scopes = selection.getSelectedScopes()
      if (scopes.length) {
        const start = commonAncestorComponent.getCellBySlot(scopes.at(0)!.slot)
        const end = commonAncestorComponent.getCellBySlot(scopes.at(-1)!.slot)
        if (start && end) {
          commonAncestorComponent.merge(start, end)
        }
      }
    }
  }

  const sub = refreshService.onRefresh.subscribe(() => {
    const commonAncestorComponent = selection.commonAncestorComponent
    update(draft => {
      draft.disabled = !(commonAncestorComponent instanceof TableComponent)
    })
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  return () => {
    const vm = viewModel()
    return <Button highlight={vm.highlight} disabled={vm.disabled} onClick={merge}><span class="xnote-icon-merge-cells"></span></Button>
  }
}
