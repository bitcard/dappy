import { takeEvery, put, select } from 'redux-saga/effects';
import { rhoValToJs } from 'rchain-toolkit/dist/utils';

import { Blockchain, TransactionStatus, BlockchainNode, MultiCallError } from '../../../models';
import * as fromBlockchain from '..';
import { buildUnforgeableNameQuery } from '../../../utils/buildUnforgeableNameQuery';
import * as fromMain from '../../main';
import { multiCall } from '../../../utils/wsUtils';
import { Action, store } from '../../';
import * as fromSettings from '../../settings';
import { singleCall } from '../../../utils/wsUtils';
import { validatePurchaseOrUpdateRecordResult } from '../../decoders';
import { getNodeIndex } from '../../../utils/getNodeIndex';

const sendRChainTransaction = function* (action: Action) {
  const payload: fromBlockchain.SendRChainTransactionPayload = action.payload;
  const rchainBlockchains: {
    [chainId: string]: Blockchain;
  } = yield select(fromSettings.getOkBlockchains);

  if (!rchainBlockchains[payload.blockchainId]) {
    yield put(
      fromMain.openModalAction({
        title: 'Failed to send transaction',
        text: `The RChain chain "${payload.blockchainId}" has not been found or there is not enough nodes available, cannot execute transaction`,
        buttons: [
          {
            classNames: 'is-link',
            text: 'Ok',
            action: fromMain.closeModalAction(),
          },
        ],
      })
    );
    return;
  }

  if (!rchainBlockchains[payload.blockchainId].nodes[0]) {
    yield put(
      fromMain.openModalAction({
        title: 'Failed to send transaction',
        text: `No nodes configured for RChain chain "${payload.blockchainId}" cannot send transaction`,
        buttons: [
          {
            classNames: 'is-link',
            text: 'Ok',
            action: fromMain.closeModalAction(),
          },
        ],
      })
    );
    return;
  }

  const node = rchainBlockchains[payload.blockchainId].nodes.find((n) => n.readyState === 1);

  let previewPrivateName = ['record', 'dapp'].includes(payload.origin.origin);
  let unforgeableName = '';
  if (previewPrivateName) {
    try {
      const channelRequest = {
        deployer: payload.transaction.deployer,
        timestamp: payload.transaction.data.timestamp,
        nameQty: 1,
      };

      const prepareDeployResponse = yield singleCall(
        { type: 'api/prepare-deploy', body: channelRequest },
        node as BlockchainNode
      );

      // TODO random node / multiple nodes
      unforgeableName = JSON.parse(prepareDeployResponse).names[0];
    } catch (err) {
      const p: fromBlockchain.RChainTransactionErrorPayload = {
        id: payload.id,
        error: err.message,
        alert: payload.alert,
      };
      if (payload.origin.origin === 'dapp') {
        p.dappId = payload.origin.dappId;
      }
      store.dispatch(fromBlockchain.rChainTransactionErrorAction(p));
      return;
    }
  }

  let deployResponse = '';
  try {
    deployResponse = yield singleCall({ type: 'api/deploy', body: payload.transaction }, node as BlockchainNode);

    if (!deployResponse.startsWith('"Success')) {
      yield put(
        fromBlockchain.rChainTransactionErrorAction({
          id: payload.id,
          error: deployResponse,
          alert: payload.alert,
        })
      );
      return;
    }

    if (payload.alert) {
      let message = 'The transaction has been successfully sent to the network';
      if (payload.origin.origin === 'transfer') {
        message =
          'The transaction has been successfully sent to the network. Your balance should update after few minutes.';
      }
      yield put(
        fromMain.openModalAction({
          title: 'Transaction successful',
          text: message,
          buttons: [
            {
              classNames: 'is-link',
              text: 'Ok',
              action: fromMain.closeModalAction(),
            },
          ],
        })
      );
    }

    yield put(
      fromBlockchain.updateRChainTransactionStatusAction({
        id: payload.id,
        status: TransactionStatus.Aired,
        value: deployResponse as string,
      })
    );

    if (previewPrivateName) {
      const unforgeableNameQuery = buildUnforgeableNameQuery(unforgeableName);
      let interval: NodeJS.Timeout;
      let dataAtNameResponseExpr;
      try {
        dataAtNameResponseExpr = yield new Promise((resolve, reject) => {
          let i = 0;
          interval = setInterval(() => {
            const state = store.getState();
            const settings: fromSettings.Settings = fromSettings.getSettings(state);
            i += 1;
            if (i > 60) {
              reject('15 minutes timeout exceeded');
              return;
            }
            try {
              multiCall(
                {
                  type: 'api/listen-for-data-at-name',
                  body: {
                    name: unforgeableNameQuery,
                    depth: 5,
                  },
                },
                {
                  chainId: payload.blockchainId,
                  urls: rchainBlockchains[payload.blockchainId].nodes
                    .filter((n) => n.readyState === 1)
                    .map(getNodeIndex),
                  resolverMode: settings.resolverMode,
                  resolverAccuracy: settings.resolverAccuracy,
                  resolverAbsolute: settings.resolverAbsolute,
                  multiCallId: fromBlockchain.LISTEN_FOR_DATA_AT_NAME,
                }
              )
                .then((resp) => {
                  const parsedResp = JSON.parse(resp.result.data);
                  if (parsedResp && parsedResp.data && parsedResp.data.expr) {
                    resolve(parsedResp.data.expr);
                    clearInterval(interval);
                  } else {
                    console.log('Did not find transaction data (unforgeable name), will try again in 15 seconds');
                  }
                })
                .catch((err: MultiCallError) => {
                  reject(err.error.error);
                });
            } catch (err) {
              reject(err.message || err);
            }
          }, 15000);
        });
      } catch (err) {
        clearInterval(interval);
        store.dispatch(
          fromBlockchain.rChainTransactionErrorAction({
            id: payload.id,
            error: 'Deploy data could not be retreived ' + (err.message || err),
            alert: payload.alert,
          })
        );
        return;
      }

      const jsValue = rhoValToJs(dataAtNameResponseExpr);

      if (payload.origin.origin === 'record') {
        validatePurchaseOrUpdateRecordResult(jsValue)
          .then((a) => {
            store.dispatch(
              fromBlockchain.updateRChainTransactionStatusAction({
                id: payload.id,
                status: TransactionStatus.Completed,
                value: jsValue,
              })
            );
          })
          .catch(() => {
            const p: fromBlockchain.RChainTransactionErrorPayload = {
              id: payload.id,
              error: 'Could not parse deploy data',
              alert: payload.alert,
            };
            if (payload.origin.origin === 'dapp') {
              p.dappId = payload.origin.dappId;
            }
            store.dispatch(fromBlockchain.rChainTransactionErrorAction(p));
          });
      } else if (payload.origin.origin === 'dapp') {
        store.dispatch(
          fromBlockchain.updateRChainTransactionStatusAction({
            id: payload.id,
            status: TransactionStatus.Completed,
            value: jsValue,
          })
        );
      }
    }
  } catch (err) {
    const p: fromBlockchain.RChainTransactionErrorPayload = {
      id: payload.id,
      error: err.message,
      alert: payload.alert,
    };
    if (payload.origin.origin === 'dapp') {
      p.dappId = payload.origin.dappId;
    }
    store.dispatch(fromBlockchain.rChainTransactionErrorAction(p));
  }

  return true;
};

export const sendRChainTransactionSaga = function* () {
  yield takeEvery(fromBlockchain.SEND_RCHAIN_TRANSACTION, sendRChainTransaction);
};
