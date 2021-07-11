import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  
  constructor(private snackbar: MatSnackBar) {
  }
  
  success(msg: string) {
    this.snackbar.open(msg, 'Dismiss', {duration: 5000, panelClass: 'message-success'});
  }
  
  successShort(msg: string) {
    this.snackbar.open(msg, 'Dismiss', {duration: 2000, panelClass: 'message-success'});
  }
  
  error(msg: string) {
    this.snackbar.open(msg, 'Dismiss', {duration: 30000, panelClass: 'message-error'});
  }
  
  info(msg: string) {
    this.snackbar.open(msg, 'Dismiss', {duration: 10000, panelClass: 'message-info'});
  }
  
  warn(msg: string) {
    this.snackbar.open(msg, 'Dismiss', {duration: 5000, panelClass: 'message-warning'});
  }
}
