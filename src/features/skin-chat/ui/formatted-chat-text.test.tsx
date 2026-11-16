import { render } from '@testing-library/react-native';
import { FormattedChatText } from './formatted-chat-text';

jest.mock('@/global.css', () => ({}));

describe('FormattedChatText', () => {
  it('renders plain text properly', async () => {
    const { getByText } = await render(<FormattedChatText text="ข้อความทั่วไป" />);
    expect(getByText('ข้อความทั่วไป')).toBeTruthy();
  });

  it('renders bold text within asterisks', async () => {
    const { getByText } = await render(
      <FormattedChatText text="แนะนำให้ใช้ **Salicylic Acid** เป็นประจำ" />,
    );
    expect(getByText('Salicylic Acid')).toBeTruthy();
  });

  it('renders bullet points with dot indicators', async () => {
    const { getByText } = await render(
      <FormattedChatText text={`• ล้างหน้าด้วยคลีนเซอร์สูตรอ่อนโยน\n• ทามอยส์เจอไรเซอร์`} />,
    );
    expect(getByText('ล้างหน้าด้วยคลีนเซอร์สูตรอ่อนโยน')).toBeTruthy();
    expect(getByText('ทามอยส์เจอไรเซอร์')).toBeTruthy();
  });

  it('renders numbered lists with numbers', async () => {
    const { getByText } = await render(
      <FormattedChatText text={`1. คลีนเซอร์\n2. เซรั่ม`} />,
    );
    expect(getByText('1.')).toBeTruthy();
    expect(getByText('คลีนเซอร์')).toBeTruthy();
    expect(getByText('2.')).toBeTruthy();
    expect(getByText('เซรั่ม')).toBeTruthy();
  });
});
