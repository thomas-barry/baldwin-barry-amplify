import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";
import { initSchema } from "@aws-amplify/datastore";

import { schema } from "./schema";



type EagerGalleryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Gallery, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly createdDate: string;
  readonly images?: (GalleryImageModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyGalleryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Gallery, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly createdDate: string;
  readonly images: AsyncCollection<GalleryImageModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type GalleryModel = LazyLoading extends LazyLoadingDisabled ? EagerGalleryModel : LazyGalleryModel

export declare const GalleryModel: (new (init: ModelInit<GalleryModel>) => GalleryModel) & {
  copyOf(source: GalleryModel, mutator: (draft: MutableModel<GalleryModel>) => MutableModel<GalleryModel> | void): GalleryModel;
}

type EagerImageModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Image, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly title: string;
  readonly description?: string | null;
  readonly s3Key: string;
  readonly uploadDate: string;
  readonly fileSize?: number | null;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly contentType?: string | null;
  readonly tags?: (string | null)[] | null;
  readonly exifData?: string | null;
  readonly location?: string | null;
  readonly camera?: string | null;
  readonly iso?: number | null;
  readonly aperture?: string | null;
  readonly shutterSpeed?: string | null;
  readonly galleries?: (GalleryImageModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyImageModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Image, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly title: string;
  readonly description?: string | null;
  readonly s3Key: string;
  readonly uploadDate: string;
  readonly fileSize?: number | null;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly contentType?: string | null;
  readonly tags?: (string | null)[] | null;
  readonly exifData?: string | null;
  readonly location?: string | null;
  readonly camera?: string | null;
  readonly iso?: number | null;
  readonly aperture?: string | null;
  readonly shutterSpeed?: string | null;
  readonly galleries: AsyncCollection<GalleryImageModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type ImageModel = LazyLoading extends LazyLoadingDisabled ? EagerImageModel : LazyImageModel

export declare const ImageModel: (new (init: ModelInit<ImageModel>) => ImageModel) & {
  copyOf(source: ImageModel, mutator: (draft: MutableModel<ImageModel>) => MutableModel<ImageModel> | void): ImageModel;
}

type EagerGalleryImageModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<GalleryImage, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly galleryId: string;
  readonly imageId: string;
  readonly gallery?: GalleryModel | null;
  readonly image?: ImageModel | null;
  readonly addedDate: string;
  readonly order?: number | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyGalleryImageModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<GalleryImage, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly galleryId: string;
  readonly imageId: string;
  readonly gallery: AsyncItem<GalleryModel | undefined>;
  readonly image: AsyncItem<ImageModel | undefined>;
  readonly addedDate: string;
  readonly order?: number | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type GalleryImageModel = LazyLoading extends LazyLoadingDisabled ? EagerGalleryImageModel : LazyGalleryImageModel

export declare const GalleryImageModel: (new (init: ModelInit<GalleryImageModel>) => GalleryImageModel) & {
  copyOf(source: GalleryImageModel, mutator: (draft: MutableModel<GalleryImageModel>) => MutableModel<GalleryImageModel> | void): GalleryImageModel;
}



const { Gallery, Image, GalleryImage } = initSchema(schema) as {
  Gallery: PersistentModelConstructor<GalleryModel>;
  Image: PersistentModelConstructor<ImageModel>;
  GalleryImage: PersistentModelConstructor<GalleryImageModel>;
};

export {
  Gallery,
  Image,
  GalleryImage
};