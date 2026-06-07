import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage'
import { storage } from './firebase'

export const uploadFile = async (path, file) => {
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return { url, path }
}

export const deleteFile = async (path) => {
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}

// Delete a file given its https download URL (or gs:// URL). Best-effort:
// a missing/invalid file is logged, not thrown, so callers can still clear
// the stored reference even if the underlying object is already gone.
export const deleteFileByUrl = async (url) => {
  if (!url) return
  try {
    await deleteObject(ref(storage, url))
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Could not delete storage file:', err)
    }
  }
}

export const getFileURL = async (path) => {
  const storageRef = ref(storage, path)
  return getDownloadURL(storageRef)
}

export const listFiles = async (folderPath) => {
  const folderRef = ref(storage, folderPath)
  const result = await listAll(folderRef)
  const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)))
  return result.items.map((item, i) => ({ name: item.name, path: item.fullPath, url: urls[i] }))
}

export const uploadPropertyFile = async (type, propId, subFolder, file) => {
  const path = `property_${type}/${propId}/${subFolder}/${Date.now()}_${file.name}`
  return uploadFile(path, file)
}
