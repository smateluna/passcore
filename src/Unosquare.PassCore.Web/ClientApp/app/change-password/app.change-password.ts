import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { Alerts } from '../models/alerts.model';
import { ChangePasswordForm } from '../models/change-password-form.model';
import { Component, OnInit, OnChanges } from '@angular/core';
import { DialogOverview } from '../dialog/app.dialog';
import { DOCUMENT } from '@angular/common';
import { filter, map, scan } from 'rxjs/operators'; // rxjs 5.5-6.x; used by Angular
import { from } from 'rxjs/observable/from'; // rxjs 5.5-6.x; used by Angular
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatSnackBar } from '@angular/material';
import { of } from 'rxjs/observable/of'; // rxjs 5.5-6.x; used by Angular
import { PasswordMatch } from '../helpers/passwordMatch';
import { PasswordModel } from '../models/password.model';
import { PasswordStrength } from '../helpers/passwordStrength';
import { range } from 'rxjs/observable/range'; // rxjs 5.5-6.x; used by Angular
import { Recaptcha } from '../models/recaptcha.model';
import { Subscription } from 'rxjs/Rx'; // rxjs 5.5-6.x; used by Angular
import { Title } from '@angular/platform-browser';
import { ViewOptions } from '../models/view-options.model';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

@Component({
  selector: 'app-root',
  templateUrl: './change-password.html',
  styleUrls: ['./app.change-password.css'],
  providers: [ChangePasswordComponent],
  viewProviders: [ViewOptions]
})
export class ChangePasswordComponent implements OnInit, OnChanges {

  // Constructor: parent "this" doesn't work here
  constructor(
    public http: HttpClient,
    public snackBar: MatSnackBar,
    public titleService: Title,
    public dialog: MatDialog,
    public r: ActivatedRoute
  ) { }

  // Properties
  color: string = 'warn';
  ErrorAlertMessage: string = '';
  FormData: PasswordModel;
  Loading: boolean = false;
  subscription: Subscription;
  value: number = 0;
  ViewOptions: ViewOptions;

  // Form Controls  
  FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.pattern(emailRegex)]),
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required]),
    newPasswordVerify: new FormControl('', [Validators.required])
  }, PasswordMatch);

  // Angular "OnChanges": happens before "OnInit"
  ngOnChanges() {
    this.subscription = this.r.queryParams.subscribe((params: Params) => {
      let userId = params['userName'] || "";
      this.GetData(userId);
    });
    this.FormGroup.valueChanges.subscribe(data => {
      if (data.newPassword != null)
        this.changeProgressBar(PasswordStrength.measureStrength(data.newPassword));
    });
  }

  // Angular "OnInit": happens only on first page load
  ngOnInit() {
    this.FormData = new PasswordModel;
    this.ViewOptions = new ViewOptions;
    this.ViewOptions.alerts = new Alerts;
    this.ViewOptions.recaptcha = new Recaptcha;
    this.ViewOptions.changePasswordForm = new ChangePasswordForm;
  }

  // Progress bar for password strength
  changeProgressBar(strength: number) {
    this.value = strength;
    if (strength < 33) {
      this.color = 'warn';
    } else if (strength > 33 && strength < 66) {
      this.color = 'accent';
    } else {
      this.color = 'primary';
    }
  }

  // Uses MatSnackBar
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 5000
    });
  }

  // Uses MatDialogRef
  openDialog(title: string, message: string) {
    let refDialog = this.dialog.open(DialogOverview, {
      width: '300px',
      data: { Title: title, Message: message }
    });
  }

  // Reset form
  clean(submited: string) {
    this.Loading = false;
    this.ErrorAlertMessage = '';
    this.color = 'warn';
    this.value = 0;

    if (submited === 'success') {
      this.FormGroup.reset();
    } else {
      for (let formControl in this.FormGroup.controls) {
        if (formControl !== 'username')
          this.FormGroup.controls[formControl].reset();
      }
    }

    if (this.ViewOptions.recaptcha.isEnabled) {
      grecaptcha.reset();
    }
  }

  // Get data from the form
  GetData(queryParam: string) {
    this.FormData.Username = queryParam;
    this.http.get('api/password').subscribe((values:ViewOptions) => {
      this.ViewOptions = values;
      this.titleService.setTitle(this.ViewOptions.changePasswordTitle + " - " + this.ViewOptions.applicationTitle);
      if (this.ViewOptions.recaptcha.isEnabled) {
        this.FormGroup.addControl('reCaptcha', new FormControl('', [Validators.required]));
        const sp = document.createElement('script');
        sp.type = 'text/javascript';
        sp.async = true;
        sp.defer = true;
        sp.src = 'https://www.google.com/recaptcha/api.js?onload=vcRecaptchaApiLoaded&render=explicit&hl=' + this.ViewOptions.recaptcha.languageCode;
      }
    });
  }

  // Uses RecaptchaModule / RecaptchaFormsModule
  SetRecaptchaResponse(captchaResponse: string) {
    this.FormData.Recaptcha = captchaResponse;
  }

  // Form submission
  Submit() {
    this.Loading = true;
    this.http.post('api/password', this.FormData).subscribe(
      response => {
        this.openDialog(this.ViewOptions.alerts.successAlertTitle, this.ViewOptions.alerts.successAlertBody);
        this.clean('success');
      },
      (error: HttpErrorResponse) => {
        this.ErrorAlertMessage = error.message ? error.message : "Password Submission Error";
        this.openSnackBar(this.ErrorAlertMessage, 'OK');
        this.clean('error');
      }
    );
  }
}