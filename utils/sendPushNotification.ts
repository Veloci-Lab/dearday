export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<boolean> {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (response.ok && !result?.data?.error) {
      return true;
    } else {
      console.error('Push failed:', result);
      return false;
    }
  } catch (err) {
    console.error('Push exception:', err);
    return false;
  }
}
