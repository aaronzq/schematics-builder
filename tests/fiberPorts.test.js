import { Component } from '../scripts/components/Component.js';
import { couplerPorts, portWorld, branchPort } from '../scripts/components/FiberPorts.js';

function close(a, b) {
    if (Math.abs(a - b) > 1e-8) throw new Error(`${a} != ${b}`);
}

Deno.test('coupler layouts and resized endpoints', () => {
    const two = new Component('fiber-coupler');
    const one = new Component('fiber-coupler-1x2');
    close(couplerPorts(two).length, 4);
    close(couplerPorts(one).length, 3);
    close(couplerPorts(one)[0].y, 0);
    two.setCouplerArmLength(100);
    close(portWorld(two, 'out1').x, 120);
    close(portWorld(two, 'out1').y, -16);
});

Deno.test('port endpoints follow artwork rotation, scale and group reflection', () => {
    const c = new Component('fiber-coupler');
    c.setPosition(100, 200);
    c.setRotation(90);
    c.setScale(2);
    close(portWorld(c, 'out1').x, 132);
    close(portWorld(c, 'out1').y, 320);
    c.groupMirror = true;
    close(portWorld(c, 'out1').x, 68);
    close(portWorld(c, 'out1').y, 320);
});

Deno.test('legacy branches get distinct ports; explicit assignments take precedence', () => {
    const c = new Component('fiber-coupler');
    const children = [{}, {}, {}];
    c.children = [0, 1, 2];
    const manager = { getComponent: id => children[id] };
    const ports = children.map(child => branchPort(c, child, manager));
    if (ports.join(',') !== 'out1,out2,in2') throw new Error(ports.join(','));
    children[0].parentPort = 'in2';
    if (branchPort(c, children[0], manager) !== 'in2') throw new Error('Assignment lost');
});
