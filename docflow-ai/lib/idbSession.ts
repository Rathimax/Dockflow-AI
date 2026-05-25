const DB_NAME = 'DocFlowSessions';

export const saveSession = async (storeName: string, data: any) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions');
      }
    };
    
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      
      // Safety check in case the store wasn't created
      if (!db.objectStoreNames.contains('sessions')) {
         return resolve(false);
      }
      
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      store.put(data, storeName);
      
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const loadSession = async (storeName: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions');
      }
    };
    
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sessions')) {
         return resolve(null);
      }
      
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const getReq = store.get(storeName);
      
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const clearSession = async (storeName: string) => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sessions')) return resolve(true);
      
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      store.delete(storeName);
      
      tx.oncomplete = () => resolve(true);
    };
  });
};
