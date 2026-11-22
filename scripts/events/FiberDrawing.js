import { Component } from '../components/Component.js';
import { componentManager } from '../components/ComponentManager.js';
import { actionHistory } from '../history/ActionHistory.js';
import { portWorld } from '../components/FiberPorts.js';

let cancelDrawing = null;

export function startFiberDrawing(connect = false) {
    cancelDrawing?.();
    const svg = document.getElementById('canvas');
    if (!svg) return;
    const previousCursor = svg.style.cursor;
    svg.style.cursor = 'crosshair';
    let points = [], preview = null, finishConnection = false;
    const position = e => {
        if (connect) {
            const dot = e.target.closest?.('[data-fiber-port]');
            const component = dot && componentManager.getComponent(Number(dot.closest('.component')?.getAttribute('data-id')));
            if (component) return portWorld(component, dot.getAttribute('data-fiber-port'));
        }
        const p = svg.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    const stop = e => { e.preventDefault(); e.stopImmediatePropagation(); };
    const cleanup = () => {
        svg.style.cursor = previousCursor;
        preview?.remove();
        window.removeEventListener('mousedown', down, true);
        window.removeEventListener('mousemove', move, true);
        window.removeEventListener('mouseup', up, true);
        window.removeEventListener('click', blockClick, true);
        document.removeEventListener('keydown', key, true);
        cancelDrawing = null;
    };
    const down = e => {
        if (!svg.contains(e.target) || e.button !== 0) return;
        stop(e);
        if (connect && preview) {
            points = roundedFiberRoute(points[0], position(e));
            finishConnection = true;
            return;
        }
        points = [position(e)];
        preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        preview.setAttribute('fill', 'none');
        preview.setAttribute('stroke', 'black');
        preview.setAttribute('stroke-width', '2');
        preview.setAttribute('stroke-linejoin', 'round');
        preview.setAttribute('pointer-events', 'none');
        svg.appendChild(preview);
    };
    const move = e => {
        if (!preview) return;
        stop(e);
        if (connect) {
            if (finishConnection) return;
            points = roundedFiberRoute(points[0], position(e));
            preview.setAttribute('d', points.map((v, i) => `${i ? 'L' : 'M'} ${v.x} ${v.y}`).join(' '));
            return;
        }
        const p = position(e), last = points[points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1) return;
        points.push(p);
        preview.setAttribute('d', points.map((v, i) => `${i ? 'L' : 'M'} ${v.x} ${v.y}`).join(' '));
    };
    const up = e => {
        if (!preview) return;
        stop(e);
        if (connect && !finishConnection) return;
        if (!connect) points.push(position(e));
        cleanup();
        // Consume the click following this drag so it cannot deselect the new line.
        const swallow = event => { stop(event); document.removeEventListener('click', swallow, true); };
        document.addEventListener('click', swallow, true);
        setTimeout(() => document.removeEventListener('click', swallow, true), 0);
        if (points.length < 3) return;
        actionHistory.run(connect ? 'Connect fiber' : 'Draw fiber', 'draw-fiber', () => {
            const origin = points[0];
            const component = new Component('draw-fiber');
            component.setPosition(origin.x, origin.y);
            component.setFiberPoints(points.map(p => ({ x: p.x - origin.x, y: p.y - origin.y })));
            const id = componentManager.idCounter++;
            const element = component.render();
            element.setAttribute('data-id', id);
            document.getElementById('schematics').appendChild(element);
            componentManager.components.set(id, component);
            componentManager.selectComponent(id);
        });
    };
    const key = e => { if (e.key === 'Escape') { stop(e); cleanup(); } };
    const blockClick = e => { if (svg.contains(e.target)) stop(e); };
    window.addEventListener('mousedown', down, true);
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    window.addEventListener('click', blockClick, true);
    document.addEventListener('keydown', key, true);
    cancelDrawing = cleanup;
}

// Horizontal leads joined by a vertical segment with two rounded corners.
export function roundedFiberRoute(start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
    const r = Math.min(20, Math.abs(dx) / 4, Math.abs(dy) / 2);
    const mx = (start.x + end.x) / 2;
    const points = [{ x: start.x, y: start.y }, { x: mx - sx * r, y: start.y }];
    const curve = (a, control, b) => {
        for (let i = 1; i <= 16; i++) {
            const t = i / 16, u = 1 - t;
            points.push({ x: u*u*a.x + 2*u*t*control.x + t*t*b.x,
                y: u*u*a.y + 2*u*t*control.y + t*t*b.y });
        }
    };
    curve(points[points.length - 1], { x: mx, y: start.y }, { x: mx, y: start.y + sy*r });
    points.push({ x: mx, y: end.y - sy*r });
    curve(points[points.length - 1], { x: mx, y: end.y }, { x: mx + sx*r, y: end.y });
    points.push({ x: end.x, y: end.y });
    return points;
}
