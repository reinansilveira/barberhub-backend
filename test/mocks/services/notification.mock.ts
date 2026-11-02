export const makeNotificationMock = () => ({
  sendEmail: jest.fn(),
  sendWhatsApp: jest.fn(),
});
