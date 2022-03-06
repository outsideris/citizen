import s3 from '../storages/s3.js';
import file from '../storages/file.js';

const storage = process.env.CITIZEN_STORAGE === 's3' ? s3 : file;

export default storage;
