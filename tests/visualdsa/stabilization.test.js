const fs = require('fs');
const path = require('path');
const arrays = require('../../public/js/visualdsa/modules/arrays/arrayModule');
const stacks = require('../../public/js/visualdsa/modules/stacks/stackModule');
const queues = require('../../public/js/visualdsa/modules/queues/queueModule');
const binarySearch = require('../../public/js/visualdsa/modules/binary-search/binarySearchModule');
const sorting = require('../../public/js/visualdsa/modules/sorting/sortingModule');
const bst = require('../../public/js/visualdsa/modules/bst/bstModule');

const root = path.join(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('VisualDSA stabilization contracts', () => {
  test('responsive and reduced-motion safeguards cover narrow workspaces and analytics tables', () => {
    const css = read('public/css/visualdsa/shell.css');
    expect(css).toMatch(/@media \(max-width: 768px\)/);
    expect(css).toMatch(/@media \(max-width: 375px\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/\.table-responsive[\s\S]*overflow-x: auto/);
    expect(css).toMatch(/min-height: 44px/);
  });

  test('instructor analytics expose text, formulas, table headers, live status, and drill-down', () => {
    const view = read('views/pages/site/visualDsaInstructor.ejs');
    expect(view).toContain('How these metrics are calculated');
    expect(view).toContain('scope="col"');
    expect(view).toContain('aria-live="polite"');
    expect(view).toContain('data-student-detail');
  });

  test('public assets contain no hidden expected-state or validation payload', () => {
    const client = read('public/js/visualdsa/visualDsaPage.js');
    const view = read('views/pages/site/visualDsaDetail.ejs');
    expect(`${client}\n${view}`).not.toMatch(/validation_data|expected_steps_hash|expectedStates/);
  });

  test('student telemetry covers pilot interactions without animation-frame events', () => {
    const client = read('public/js/visualdsa/visualDsaPage.js');
    ['module_opened', 'mode_selected', 'custom_input_submitted', 'step_advanced'].forEach((eventType) =>
      expect(client).toContain(`'${eventType}'`));
    expect(client).not.toMatch(/requestAnimationFrame[\s\S]*emitEvent|emitEvent[\s\S]*requestAnimationFrame/);
  });

  test('student pages expose persisted practice and recorded-assessment controls', () => {
    const moduleView=read('views/pages/site/visualDsaDetail.ejs');const progressView=read('views/pages/site/visualDsaProgress.ejs');const progressClient=read('public/js/visualdsa/progressPage.js');
    expect(moduleView).toContain('data-practice-start');expect(progressView).toContain('data-assessment-workspace');expect(progressClient).toContain('/api/visualdsa/assessment-attempts');expect(progressClient).toContain('Correctness is shown only after final submission.');
  });

  test('VisualDSA navigation has an accessible persistent collapse control',()=>{const landing=read('views/pages/site/visualDsa.ejs');const detail=read('views/pages/site/visualDsaDetail.ejs');const navigation=read('public/js/visualdsa/navigation.js');expect(landing).toContain('data-visualdsa-sidebar-toggle');expect(detail).toContain('data-visualdsa-sidebar-toggle');expect(navigation).toContain("localStorage.setItem(storageKey");expect(navigation).toContain("aria-expanded");expect(navigation).toContain("Show VisualDSA menu");});
  test('student assistance is contextual, accessible, and does not claim to reveal assessment answers',()=>{const detail=read('views/pages/site/visualDsaDetail.ejs');expect(detail).toContain('visualdsa-student-toolkit');expect(detail).toContain('<details open>');expect(detail).toContain('This hint explains a strategy without revealing a recorded-assessment answer.');expect(detail).toContain('Text labels:');});
  test('workspace panels normalize text, form, list, and counter alignment',()=>{const css=read('public/css/visualdsa/shell.css');expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto');expect(css).toContain('text-align: right');expect(css).toContain('.visualdsa-response-form');expect(css).toContain('padding-inline-start: 1.75rem');expect(css).toContain('overflow-wrap: anywhere');});

  test('representative module traces remain bounded for SVG rendering', () => {
    const traces = [
      arrays.generateSteps({ operation: 'insert', values: [1, 2, 3, 4], index: 0, newValue: 5, capacity: 6 }),
      stacks.generateSteps({ operation: 'pop', values: ['1', '2'], capacity: 6 }),
      queues.generateSteps({ operation: 'dequeue', values: ['1', '2'], capacity: 6, front: 4 }),
      binarySearch.generateSteps({ values: [1, 3, 5, 7, 9, 11, 13], target: 13 }),
      sorting.generateSteps({ algorithm: 'bubble', values: [6, 5, 4, 3, 2, 1] }),
      bst.generateSteps({ operation: 'traverse', values: [40, 20, 60, 10, 30], traversal: 'inorder' })
    ];
    traces.forEach((trace) => expect(trace.length).toBeLessThan(250));
  });
});
