import axios from 'axios';
import { show_alert } from './alert';

export const updateData = async (data, type) => {
  //type is either password or normal name and email data
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url: url,
      data: data,
    });
    if (res.data.status === 'success') {
      show_alert('success', 'Data Updated');
      window.setTimeout(() => {
        location.assign('#');
      }, 1500);
    }
  } catch (err) {
    show_alert('error', err.response.data.message);
  }
};
