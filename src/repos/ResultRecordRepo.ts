/**
 * Created by steca
 */

import Log from '../Util';
import { IConfig, AppConfig } from '../Config';
import mongodb = require('mongodb');
import db, {MongoDB, InsertOneResponse} from '../db/MongoDB';
import CommitCommentRecord, {CommitComment} from '../model/requests/CommitComment';
import ResultRecord, {Result} from '../model/results/ResultRecord';
import { Deliverable } from '../model/settings/DeliverableRecord';
import { Course } from '../model/settings/CourseRecord';

const RESULTS_COLLECTION = 'results';
const DELIVERABLES_COLLECTION = 'deliverables';
const OBJECT_ID_PROPERTY = '_id';

export default class CommitCommentRepo {

  private db: MongoDB;

  constructor() {
    this.db = db;
  }
  
  /**
   * Retrieves the latest result record based on Query
   * @param _user: username of the github account
   * @param _deliverable: the abbreivation, ie. d1, d2, of the Deliverable.
   * @return Promise<CommitComment> CommitComment interface object
   */
  public getGithubGradeComments(_username: string, _commit: string): Promise<Result[]> {
    let query: object = { user: _username, commit: _commit };

    return new Promise<Result[]>((fulfill, reject) => {
      try {
        db.getRecords(RESULTS_COLLECTION, query).then((results: Result[]) => {
          fulfill(results);
        });
      }
      catch (err) {
        Log.error(`CommitCommentRepo::getLatestGradeRequest: ${err}`);
        reject(err)
      }
    });
  }


  /**
   * Update ResultRecords with gradeRequested boolean flag based on isProcessed 
   * && isRequest == true in RequestRecord.
   * @param _commitComment CommitComment object that is being stored
   * @return <InsertOneResponse> that includes number of successful DB entries
   */
  public updateResultRecords(_username: string, _commit: string, 
    _gradeRequested: boolean): Promise<mongodb.UpdateWriteOpResult> {
    let context: mongodb.Db; 
    try {
      return new Promise<mongodb.UpdateWriteOpResult>((fulfill, reject) => {
        db.getInstance()
          .then((_db: mongodb.Db) => {
            if (_db) {
              context = _db;
              return _db;
            }
            throw `Could not retrieve DB connection in updateResultRecords()`;
          })
          .then(() => {
            return new Promise<Result[]>((fulfill, reject) => {
              context.collection(RESULTS_COLLECTION).find({user: _username, commit: _commit})
                .toArray((err: Error, results: Result[]) => {
                  if (results.length > 0) {
                  fulfill(results);
                  return;
                  }
                  reject(`No ResultRecords for ${_commit} and username ${_username} to update gradeRequested property.`);
              });
            });
          })
          .then((results: Result[]) => {
            let resultIds = new Array();
            for (let result of results) {
              resultIds.push(result._id);
            }
            context.collection(RESULTS_COLLECTION).updateMany({_id: {$in: resultIds}}, {$set: {gradeRequsted: true}})
              .then((onfulfilled: mongodb.UpdateWriteOpResult) => {
                Log.info('ResultRecordrepo:: updateResultRecords() Updated ' + onfulfilled.modifiedCount + ' records');
                fulfill(onfulfilled);
              });
          });
        });
    }
    catch (err) {
      Log.info(`ResultRecordRepo::updateResultRecords(): ${err}.`);
    }
  }

  /**
   * Insert a CommitComment to the 'requests' collection on MongoDB
   * @param _commitComment CommitComment object that is being stored
   * @return <InsertOneResponse> that includes number of successful DB entries
   */cd 
  public insertCommitComment(_commitComment: CommitComment): Promise<InsertOneResponse> {
    try {
      return new Promise<InsertOneResponse>((fulfill, reject) => {
        db.insertRecord(RESULTS_COLLECTION, _commitComment)
          .then((response: InsertOneResponse) => {
            if (response.insertedCount > 0) {
              fulfill(response);
            }
            reject(response);
        });
      });
    }
    catch (err) {
      throw `CommitCommentRepo::insertCommitComment: ${err}.`
    }
  }
}