import { settingsSections } from './settings-sections';

describe('settingsSections', () => {
  it('keeps notifications inside settings and exposes account actions', () => {
    expect(settingsSections.map((section) => section.title)).toEqual([
      'บัญชี', 'การแจ้งเตือน', 'ความเป็นส่วนตัว', 'ช่วยเหลือ',
    ]);
    expect(settingsSections[1].items).toContain('เตือนรูทีนตอนเช้า');
    expect(settingsSections[0].items).toContain('บัญชีที่เชื่อมต่อ เช่น Google / Apple');
  });
});
