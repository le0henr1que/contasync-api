import { Test, TestingModule } from '@nestjs/testing';
import { DocumentFoldersService } from './document-folders.service';

describe('DocumentFoldersService', () => {
  let service: DocumentFoldersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentFoldersService],
    }).compile();

    service = module.get<DocumentFoldersService>(DocumentFoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
