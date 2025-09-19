import React, { useCallback, useContext, useState } from "react";

const context = React.createContext({
  videoId: "",
  setVideoId: (prevValue: string) => { },
  getTrailerId: (id: number | string) => { },
  closeModal: () => { },
  isModalOpen: false,
  showSidebar: false,
  setShowSidebar: (prevValue: boolean) => { },
  setIsModalOpen: (value: boolean) => { }
});

interface Props {
  children: React.ReactNode;
}

const GlobalContextProvider = ({ children }: Props) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    if (!isModalOpen) return;
    setIsModalOpen(false);
    setVideoId("")
  }, [isModalOpen]);

  const getTrailerId = async (id: number | string) => {
    try {
      // For music app, use track ID directly as videoId for consistency
      // The actual preview URL will be handled by the audio player
      setVideoId(String(id));
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <context.Provider
      value={{
        getTrailerId,
        videoId,
        closeModal,
        isModalOpen,
        setVideoId,
        showSidebar,
        setShowSidebar,
        setIsModalOpen
      }}
    >
      {children}
    </context.Provider>
  );
};

export default GlobalContextProvider;

export const useGlobalContext = () => {
  return useContext(context);
};
