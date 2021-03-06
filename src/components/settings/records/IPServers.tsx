import * as React from 'react';
import { Formik, Field, FieldArray } from 'formik';
import { IPServer } from '../../../models';

import './IPServers.scss';

interface IPServersComponentProps {
  ipServers: IPServer[];
  back: () => void;
  setIpServers: (a: IPServer[]) => void;
}

const REGEXP_IP = /^(?!\.)^[a-z0-9.-]*$/;
const REGEXP_HOST = /^(?!\.)^[a-z0-9.]*$/;

export class IPServersComponent extends React.Component<IPServersComponentProps> {
  state: { retrieveError: { [n: number]: string } } = {
    retrieveError: {},
  };

  retrieveIpAddressAndCert = (
    index: number,
    host: string,
    setFieldValue: (a: string, b: string) => void,
    setFieldTouched: (a: string, b: boolean) => void
  ) => {
    if (typeof host === 'string') {
      window
        .getIpAddressAndCert({ host: host })
        .then((a: { ip: string; cert: string }) => {
          if (a.ip && a.cert && typeof a.ip === 'string' && typeof a.cert === 'string') {
            setFieldValue(`servers.${index}.cert`, a.cert);
            setFieldTouched(`servers.${index}.cert`, true);
            setFieldValue(`servers.${index}.ip`, a.ip);
            setFieldTouched(`servers.${index}.ip`, true);
          }
          this.setState({
            retrieveError: {
              ...this.state.retrieveError,
              [index]: '',
            },
          });
        })
        .catch((err: Error) => {
          this.setState({
            retrieveError: {
              ...this.state.retrieveError,
              [index]: err.message || err,
            },
          });
        });
    }
  };

  render() {
    return (
      <Formik
        initialValues={{
          servers: this.props.ipServers.length ? this.props.ipServers : [{ ip: '', host: '', cert: '', primary: true }],
        }}
        validate={(values) => {
          const errors: { [key: string]: { [key: string]: { ip?: string; cert?: string; host?: string } } } = {};

          const ips: { [key: string]: boolean } = {};
          values.servers.forEach((s, index) => {
            let ipError;
            let hostError;
            let certError;
            if (s.ip) {
              // IP does not have to be unique
              /* if (ips[s.ip]) {
                ipError = t('ip must be unique');
              } */
              if (!REGEXP_IP.test(s.ip)) {
                ipError = t('ip must be valid');
              } else {
                ips[s.ip] = true;
              }
            } else {
              ipError = t('must set ip');
            }
            if (!s.host) {
              hostError = t('host must be set');
            } else if (!REGEXP_HOST.test(s.host)) {
              hostError = t('host must be valid');
            }

            if (!s.cert) {
              certError = t('cert must be set');
            }
            if (ipError || hostError || certError) {
              if (!errors.servers) errors.servers = {};
              if (!errors.servers[index]) errors.servers[index] = {};

              if (ipError) {
                errors.servers[index].ip = ipError;
              }
              if (hostError) {
                errors.servers[index].host = hostError;
              }
              if (certError) {
                errors.servers[index].cert = certError;
              }
            }
          });

          return errors;
        }}
        onSubmit={() => {}}
        render={({ values, touched, errors, setFieldValue, setFieldTouched }) => (
          <div>
            <FieldArray
              name="servers"
              render={(arrayHelpers) => (
                <div>
                  {values.servers.map((s, index) => {
                    const touchedServer = touched.servers ? touched.servers[index] : {};
                    const errorsServer = errors.servers ? errors.servers[index] : {};
                    const retrieveError = this.state.retrieveError[index];
                    return (
                      <div key={index} className="ip-server">
                        <h5 className="is-6 title">
                          {values.servers[index] && values.servers[index].ip
                            ? values.servers[index].ip
                            : `${t('server')} ${index + 1}`}
                          {index === values.servers.length - 1 ? (
                            <i
                              className="fa fa-after fa-trash"
                              title={t('remove server')}
                              onClick={() => arrayHelpers.pop()}></i>
                          ) : undefined}
                        </h5>
                        <div className="field is-horizontal">
                          <label className="label">{t('host name')}*</label>
                          <div className="control">
                            <Field
                              className="input"
                              type="text"
                              name={`servers.${index}.host`}
                              placeholder="dappy.tech"
                            />
                            <button
                              type="button"
                              className="button is-link is-small"
                              onClick={() =>
                                this.retrieveIpAddressAndCert(
                                  index,
                                  values.servers[index].host,
                                  setFieldValue,
                                  setFieldTouched
                                )
                              }>
                              Try to retrieve IP and certificate
                            </button>
                          </div>
                        </div>
                        {retrieveError && <p className="text-danger">{retrieveError}</p>}
                        {touchedServer && touchedServer.host && errorsServer && errorsServer.host && (
                          <p className="text-danger">{errorsServer.host}</p>
                        )}
                        <div className="field is-horizontal">
                          <label className="label">{t('ip address')}*</label>
                          <div className="control">
                            <Field
                              className="input"
                              type="text"
                              name={`servers.${index}.ip`}
                              placeholder="12.12.12.12"
                            />
                          </div>
                        </div>
                        {touchedServer && touchedServer.ip && errorsServer && errorsServer.ip && (
                          <p className="text-danger">{errorsServer.ip}</p>
                        )}
                        <div className="field is-horizontal">
                          <label className="label">{t('certificate')}*</label>
                          <div className="control">
                            <Field
                              className="input"
                              type="text"
                              component="textarea"
                              name={`servers.${index}.cert`}
                              placeholder="-----BEGIN CERTIFICATE-----"
                            />
                          </div>
                        </div>
                        <div className="field is-horizontal">
                          {/*                             <Field
                              className="is-checkradio is-link is-inverted"
                              component="input"
                              type="checkbox"
                              name={`servers.${index}.primary`}
                            /> */}
                          <input
                            className="is-checkradio is-link is-inverted"
                            id="exampleCheckbox"
                            type="checkbox"
                            onChange={() => {}}
                            checked={s.primary}
                          />
                          <label
                            onClick={() => setFieldValue(`servers.${index}.primary`, !s.primary)}
                            className="label">
                            {t('primary server')}*
                          </label>
                          <div className="primary-label-description label-description">
                            {t('primary server paragraph')}
                          </div>
                        </div>
                        {touchedServer && touchedServer.cert && errorsServer && errorsServer.cert && (
                          <p className="text-danger">{errorsServer.cert}</p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="button is-link is-small"
                    onClick={() => arrayHelpers.push({ ip: '', host: '', cert: '', primary: false })}>
                    {t('add a server')}
                    <i className="fa fa-plus fa-after"></i>
                  </button>
                  <div className="field is-horizontal is-grouped pt20">
                    <div className="control">
                      <button
                        type="button"
                        onClick={() => {
                          this.props.setIpServers(
                            values.servers.map((s) => {
                              return {
                                ...s,
                                cert: encodeURI(s.cert),
                              };
                            })
                          );
                          this.props.back();
                        }}
                        className="button is-link"
                        disabled={Object.keys(errors).length > 0}>
                        {t('save ip servers')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      />
    );
  }
}
