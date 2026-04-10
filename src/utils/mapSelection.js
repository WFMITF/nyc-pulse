export function getPointerHitElements(event) {
  if (typeof document === 'undefined') return []
  return document.elementsFromPoint(event.clientX, event.clientY) || []
}

export function isMapFeatureElement(element) {
  if (!(element instanceof Element)) return false

  if (element.classList.contains('zip-path')) return true

  if (
    element.tagName.toLowerCase() === 'circle' &&
    element.closest('.dots-layer')
  ) {
    return true
  }

  return false
}

export function isBlankMapPointer(event, svgElement) {
  const hitElements = getPointerHitElements(event)

  return !hitElements.some((el) => {
    if (!svgElement?.contains(el)) return false
    return isMapFeatureElement(el)
  })
}

function normalizeSelection(selection) {
  if (!selection) return null

  const [[x0, y0], [x1, y1]] = selection

  return [
    [Math.min(x0, x1), Math.min(y0, y1)],
    [Math.max(x0, x1), Math.max(y0, y1)]
  ]
}

export function getFeatureBoundsInViewport(feature, path, transform) {
  const [[bx0, by0], [bx1, by1]] = path.bounds(feature)

  const x0 = transform.applyX(bx0)
  const y0 = transform.applyY(by0)
  const x1 = transform.applyX(bx1)
  const y1 = transform.applyY(by1)

  return [
    [Math.min(x0, x1), Math.min(y0, y1)],
    [Math.max(x0, x1), Math.max(y0, y1)]
  ]
}

export function selectionIntersectsFeature(selection, feature, path, transform) {
  const rect = normalizeSelection(selection)
  if (!rect) return false

  const [[sx0, sy0], [sx1, sy1]] = rect
  const [[fx0, fy0], [fx1, fy1]] = getFeatureBoundsInViewport(feature, path, transform)

  return fx1 >= sx0 && fx0 <= sx1 && fy1 >= sy0 && fy0 <= sy1
}

export function getSelectionZipsFromFeatures(selection, features, path, transform) {
  if (!selection) return []

  return (features ?? [])
    .filter((feature) => selectionIntersectsFeature(selection, feature, path, transform))
    .map((feature) => feature.properties.primary_zip)
}