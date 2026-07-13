import dbService from "../../../core/database/DatabaseService";
import { DatabaseAdapter } from "../../../core/database/DatabaseAdapter";

export abstract class BaseRepository {
  protected get db(): DatabaseAdapter {
    return dbService.getAdapter();
  }
}

export default BaseRepository;
