import React from 'react';
import { ImageLightbox } from '../../../components/common/ImageLightbox';

export interface ZoomLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
}

export const ZoomLightbox: React.FC<ZoomLightboxProps> = ({
  imageUrl,
  onClose,
  altText = 'Ampliación de fotografía',
}) => {
  return <ImageLightbox imageUrl={imageUrl} onClose={onClose} altText={altText} />;
};

export default ZoomLightbox;
