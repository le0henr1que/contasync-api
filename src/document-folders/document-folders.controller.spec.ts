import { Test, TestingModule } from '@nestjs/testing';
import { DocumentFoldersController } from './document-folders.controller';

describe('DocumentFoldersController', () => {
  let controller: DocumentFoldersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentFoldersController],
    }).compile();

    controller = module.get<DocumentFoldersController>(DocumentFoldersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
