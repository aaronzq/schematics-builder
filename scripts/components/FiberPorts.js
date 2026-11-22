export function isCoupler(component) {
    return component?.type === 'fiber-coupler' || component?.type === 'fiber-coupler-1x2';
}

export function couplerPorts(component) {
    const length = 20 + (component?.couplerArmLength ?? 40);
    const inputs = component?.type === 'fiber-coupler-1x2'
        ? [{ id: 'in1', label: 'Input', x: -length, y: 0 }]
        : [{ id: 'in1', label: 'Left upper', x: -length, y: -16 },
           { id: 'in2', label: 'Left lower', x: -length, y: 16 }];
    return [...inputs,
        { id: 'out1', label: 'Right upper', x: length, y: -16 },
        { id: 'out2', label: 'Right lower', x: length, y: 16 }];
}

export function portWorld(component, id) {
    const port = couplerPorts(component).find(p => p.id === id) || couplerPorts(component)[0];
    const m = component._getFlipMatrix();
    return component.localToWorld(
        component.scale * (m.a * port.x + m.c * port.y),
        component.scale * (m.b * port.x + m.d * port.y) * (component.groupMirror ? -1 : 1)
    );
}

export function branchPort(parent, child, manager) {
    const allowed = couplerPorts(parent).filter(p => p.id !== (parent.couplerInputPort || 'in1'));
    if (allowed.some(p => p.id === child.parentPort)) return child.parentPort;
    const index = parent.children.findIndex(id => manager.getComponent(id) === child);
    const ordered = [...allowed].sort((a,b) => a.id.localeCompare(b.id)).sort((a,b) => Number(b.id.startsWith('out')) - Number(a.id.startsWith('out')));
    return (ordered[index] || allowed[0]).id;
}
