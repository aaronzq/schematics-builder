// Ray calculations use the first point when a drawn fiber is the child.
// When it is the parent, translate its aperture to the transformed last point.
const outputView = Symbol('fiberOutput');
export function outputAperture(parent) {
    if (parent?.type !== 'draw-fiber' || !parent.fiberPoints?.length || parent[outputView]) return parent;
    const end = parent.getArrowOrigin();
    const view = Object.create(parent);
    view[outputView] = true;
    view.x = end.x;
    view.y = end.y;
    return view;
}
